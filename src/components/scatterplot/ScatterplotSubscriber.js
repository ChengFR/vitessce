/* eslint-disable */
import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { extent } from 'd3-array';
import isEqual from 'lodash/isEqual';
import TitleInfo from '../TitleInfo';
import { pluralize, capitalize } from '../../utils';
import { useDeckCanvasSize, useReady, useUrls } from '../hooks';
import { setCellSelection, mergeCellSets } from '../utils';
import { getCellSetPolygons } from '../sets/cell-set-utils';
import {
  useCellsData,
  useCellSetsData,
  useGeneSelection,
  useExpressionAttrs,
} from '../data-hooks';
import { getCellColors } from '../interpolate-colors';
import Scatterplot from './Scatterplot';
import ScatterplotTooltipSubscriber from './ScatterplotTooltipSubscriber';
import ScatterplotOptions from './ScatterplotOptions';
import {
  useCoordination,
  useLoaders,
  useSetComponentHover,
  useSetComponentViewInfo,
} from '../../app/state/hooks';
import {
  getPointSizeDevicePixels,
  getPointOpacity,
} from '../shared-spatial-scatterplot/dynamic-opacity';
import { COMPONENT_COORDINATION_TYPES } from '../../app/state/coordination';

const SCATTERPLOT_DATA_TYPES = ['cells', 'expression-matrix', 'cell-sets'];

/**
 * A subscriber component for the scatterplot.
 * @param {object} props
 * @param {number} props.uuid The unique identifier for this component.
 * @param {string} props.theme The current theme name.
 * @param {object} props.coordinationScopes The mapping from coordination types to coordination
 * scopes.
 * @param {boolean} props.disableTooltip Should the tooltip be disabled?
 * @param {function} props.removeGridComponent The callback function to pass to TitleInfo,
 * to call when the component has been removed from the grid.
 * @param {string} props.title An override value for the component title.
 */
export default function ScatterplotSubscriber(props) {
  const {
    uuid,
    coordinationScopes,
    removeGridComponent,
    theme,
    disableTooltip = false,
    observationsLabelOverride: observationsLabel = 'cell',
    observationsPluralLabelOverride: observationsPluralLabel = `${observationsLabel}s`,
    title: titleOverride,

    // Point size at which we switch to using opacity rather than size to make the points smaller.
    minimumPointSize = 1.5,
    // Average fill density.
    avgFillDensity,
  } = props;

  const loaders = useLoaders();
  const setComponentHover = useSetComponentHover();
  const setComponentViewInfo = useSetComponentViewInfo(uuid);

  // Get "props" from the coordination space.
  const [{
    dataset,
    embeddingZoom: zoom,
    embeddingTargetX: targetX,
    embeddingTargetY: targetY,
    embeddingTargetZ: targetZ,
    embeddingType: mapping,
    cellFilter,
    cellHighlight,
    geneSelection,
    cellSetSelection,
    cellSetColor,
    cellColorEncoding,
    additionalCellSets,
    embeddingCellSetPolygonsVisible: cellSetPolygonsVisible,
    embeddingCellSetLabelsVisible: cellSetLabelsVisible,
    embeddingCellSetLabelSize: cellSetLabelSize,
    embeddingCellRadius: cellRadiusFixed,
    embeddingCellRadiusMode: cellRadiusMode,
    embeddingCellOpacity: cellOpacityFixed,
    embeddingCellOpacityMode: cellOpacityMode,
    geneExpressionColormapRange,
  }, {
    setEmbeddingZoom: setZoom,
    setEmbeddingTargetX: setTargetX,
    setEmbeddingTargetY: setTargetY,
    setEmbeddingTargetZ: setTargetZ,
    setCellFilter,
    setCellSetSelection,
    setCellHighlight,
    setCellSetColor,
    setCellColorEncoding,
    setAdditionalCellSets,
    setEmbeddingCellSetPolygonsVisible: setCellSetPolygonsVisible,
    setEmbeddingCellSetLabelsVisible: setCellSetLabelsVisible,
    setEmbeddingCellSetLabelSize: setCellSetLabelSize,
    setEmbeddingCellRadius: setCellRadiusFixed,
    setEmbeddingCellRadiusMode: setCellRadiusMode,
    setEmbeddingCellOpacity: setCellOpacityFixed,
    setEmbeddingCellOpacityMode: setCellOpacityMode,
  }] = useCoordination(COMPONENT_COORDINATION_TYPES.scatterplot, coordinationScopes);

  const [urls, addUrl, resetUrls] = useUrls();
  const [width, height, deckRef] = useDeckCanvasSize();
  const [isReady, setItemIsReady, resetReadyItems] = useReady(
    SCATTERPLOT_DATA_TYPES,
  );

  const title = titleOverride || `Scatterplot (${mapping})`;

  // Reset file URLs and loader progress when the dataset has changed.
  useEffect(() => {
    resetUrls();
    resetReadyItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, dataset]);

  // Get data from loaders using the data hooks.
  const [cells, cellsCount] = useCellsData(loaders, dataset, setItemIsReady, addUrl, true);
  const [cellSets] = useCellSetsData(
    loaders,
    dataset,
    setItemIsReady,
    addUrl,
    false,
    { setCellSetSelection, setCellSetColor },
    { cellSetSelection, cellSetColor },
  );
  const [expressionData] = useGeneSelection(
    loaders, dataset, setItemIsReady, false, geneSelection,
  );
  const [attrs] = useExpressionAttrs(
    loaders, dataset, setItemIsReady, addUrl, false,
  );
  const [dynamicCellRadius, setDynamicCellRadius] = useState(cellRadiusFixed);
  const [dynamicCellOpacity, setDynamicCellOpacity] = useState(cellOpacityFixed);

  const mergedCellSets = useMemo(() => mergeCellSets(
    cellSets, additionalCellSets,
  ), [cellSets, additionalCellSets]);

  const setCellSelectionProp = useCallback((v) => {
    setCellSelection(
      v, additionalCellSets, cellSetColor,
      setCellSetSelection, setAdditionalCellSets, setCellSetColor,
      setCellColorEncoding,
    );
  }, [additionalCellSets, cellSetColor, setCellColorEncoding,
    setAdditionalCellSets, setCellSetColor, setCellSetSelection]);

  const cellColors = useMemo(() => getCellColors({
    cellColorEncoding,
    expressionData: expressionData && expressionData[0],
    geneSelection,
    cellSets: mergedCellSets,
    cellSetSelection,
    cellSetColor,
    expressionDataAttrs: attrs,
  }), [cellColorEncoding, geneSelection, mergedCellSets,
    cellSetSelection, cellSetColor, expressionData, attrs]);

  // cellSetPolygonCache is an array of tuples like [(key0, val0), (key1, val1), ...],
  // where the keys are cellSetSelection arrays.
  const [cellSetPolygonCache, setCellSetPolygonCache] = useState([]);
  const cacheHas = (cache, key) => cache.findIndex(el => isEqual(el[0], key)) !== -1;
  const cacheGet = (cache, key) => cache.find(el => isEqual(el[0], key))?.[1];
  const cellSetPolygons = useMemo(() => {
    if ((cellSetLabelsVisible || cellSetPolygonsVisible)
      && !cacheHas(cellSetPolygonCache, cellSetSelection)
      && mergedCellSets?.tree?.length
      && Object.values(cells).length
      && cellSetColor?.length) {
      const newCellSetPolygons = getCellSetPolygons({
        cells,
        mapping,
        cellSets: mergedCellSets,
        cellSetSelection,
        cellSetColor,
      });
      setCellSetPolygonCache(cache => [...cache, [cellSetSelection, newCellSetPolygons]]);
      return newCellSetPolygons;
    }
    return cacheGet(cellSetPolygonCache, cellSetSelection) || [];
  }, [cellSetPolygonsVisible, cellSetPolygonCache, cellSetLabelsVisible,
    cells, mapping, mergedCellSets, cellSetSelection, cellSetColor]);


  const cellSelection = useMemo(() => Array.from(cellColors.keys()), [cellColors]);

  const [xRange, yRange, xExtent, yExtent, numCells] = useMemo(() => {
    const cellValues = cells && Object.values(cells);
    if (cellValues?.length) {
      const cellCoordinates = Object.values(cells)
        .map(c => c.mappings[mapping]);
      const xExtent = extent(cellCoordinates, c => c[0]);
      const yExtent = extent(cellCoordinates, c => c[1]);
      const xRange = xExtent[1] - xExtent[0];
      const yRange = yExtent[1] - yExtent[0];
      return [xRange, yRange, xExtent, yExtent, cellValues.length];
    }
    return [null, null, null, null, null];
  }, [cells, mapping]);

  // After cells have loaded or changed,
  // compute the cell radius scale based on the
  // extents of the cell coordinates on the x/y axes.
  useEffect(() => {
    if(xRange && yRange) {
      const pointSizeDevicePixels = getPointSizeDevicePixels(window.devicePixelRatio, zoom, xRange, yRange, width, height);
      setDynamicCellRadius(pointSizeDevicePixels);

      const nextCellOpacityScale = getPointOpacity(zoom, width, height, numCells, avgFillDensity);
      setDynamicCellOpacity(nextCellOpacityScale);
      
      if (typeof targetX !== 'number' || typeof targetY !== 'number') {
        const newTargetX = xExtent[0] + xRange / 2;
        const newTargetY = yExtent[0] + yRange / 2;
        const newZoom = Math.log2(Math.min(width / xRange, height / yRange));
        setTargetX(newTargetX);
        // Graphics rendering has the y-axis going south so we need to multiply by negative one.
        setTargetY(-newTargetY);
        setZoom(newZoom);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xRange, yRange, xExtent, yExtent, numCells, cells, mapping, width, height, zoom, avgFillDensity]);

  const getCellInfo = useCallback((cellId) => {
    const cellInfo = cells[cellId];
    return {
      [`${capitalize(observationsLabel)} ID`]: cellId,
      ...(cellInfo ? cellInfo.factors : {}),
    };
  }, [cells, observationsLabel]);

  const cellRadius = useMemo(() => {
    if(cellRadiusMode == "absolute") {
      return cellRadiusFixed;
    } else if(cellRadiusMode == "relative") {
      return cellRadiusFixed;
    } else if(cellRadiusMode == "dynamic") {
      return dynamicCellRadius;
    }
  }, [cellRadiusMode, dynamicCellRadius, cellRadiusFixed]);

  const cellOpacity = useMemo(() => {
    if(cellOpacityMode == "static") {
      return cellOpacityFixed;
    } else if(cellOpacityMode == "cellSetSelection") {
      return null;
    } else if(cellOpacityMode == "dynamic") {
      return dynamicCellOpacity;
    }
  }, [cellOpacityMode, dynamicCellOpacity, cellOpacityFixed]);

  return (
    <TitleInfo
      title={title}
      info={`${cellsCount} ${pluralize(observationsLabel, observationsPluralLabel, cellsCount)}`}
      removeGridComponent={removeGridComponent}
      urls={urls}
      theme={theme}
      isReady={isReady}
      options={(
        <ScatterplotOptions
          observationsLabel={observationsLabel}
          cellRadius={cellRadiusFixed}
          setCellRadius={setCellRadiusFixed}
          cellRadiusMode={cellRadiusMode}
          setCellRadiusMode={setCellRadiusMode}
          cellOpacity={cellOpacityFixed}
          setCellOpacity={setCellOpacityFixed}
          cellOpacityMode={cellOpacityMode}
          setCellOpacityMode={setCellOpacityMode}
          cellSetLabelsVisible={cellSetLabelsVisible}
          setCellSetLabelsVisible={setCellSetLabelsVisible}
          cellSetLabelSize={cellSetLabelSize}
          setCellSetLabelSize={setCellSetLabelSize}
          cellSetPolygonsVisible={cellSetPolygonsVisible}
          setCellSetPolygonsVisible={setCellSetPolygonsVisible}
          cellColorEncoding={cellColorEncoding}
          setCellColorEncoding={setCellColorEncoding}
        />
      )}
    >
      <Scatterplot
        ref={deckRef}
        uuid={uuid}
        theme={theme}
        viewState={{ zoom, target: [targetX, targetY, targetZ] }}
        setViewState={({ zoom: newZoom, target }) => {
          setZoom(newZoom);
          setTargetX(target[0]);
          setTargetY(target[1]);
          setTargetZ(target[2]);
        }}
        cells={cells}
        mapping={mapping}
        cellFilter={cellFilter}
        cellSelection={cellSelection}
        cellHighlight={cellHighlight}
        cellColors={cellColors}
        cellSetPolygons={cellSetPolygons}
        cellSetLabelSize={cellSetLabelSize}
        cellSetLabelsVisible={cellSetLabelsVisible}
        cellSetPolygonsVisible={cellSetPolygonsVisible}
        setCellFilter={setCellFilter}
        setCellSelection={setCellSelectionProp}
        setCellHighlight={setCellHighlight}
        cellRadius={cellRadius}
        cellOpacity={cellOpacity}
        cellColorEncoding={cellColorEncoding}
        geneExpressionColormapRange={geneExpressionColormapRange}
        setComponentHover={() => {
          setComponentHover(uuid);
        }}
        updateViewInfo={setComponentViewInfo}
      />
      {!disableTooltip && (
      <ScatterplotTooltipSubscriber
        parentUuid={uuid}
        cellHighlight={cellHighlight}
        width={width}
        height={height}
        getCellInfo={getCellInfo}
      />
      )}
    </TitleInfo>
  );
}
