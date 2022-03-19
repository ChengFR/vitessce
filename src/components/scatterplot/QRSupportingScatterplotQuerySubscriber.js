/* eslint-disable */
import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { LinearInterpolator } from '@deck.gl/core';
import { TRANSITION_EVENTS } from 'deck.gl';
import { extent } from 'd3-array';
import isEqual from 'lodash/isEqual';
import TitleInfo from '../TitleInfo';
import { pluralize, capitalize } from '../../utils';
import {
  useDeckCanvasSize, useReady, useUrls, useExpressionValueGetter,
} from '../hooks';
import { setCellSelection, mergeCellSets } from '../utils';
import { getCellSetPolygons } from '../sets/cell-set-utils';
import {
  useCellsData,
  useCellSetsData,
  useGeneSelection,
  useExpressionAttrs,
  useAnnDataStatic,
  useAnnDataDynamic,
  useAnnDataIndices,
  useCellSetsTree,
  useDiffGeneNames,
  useInitialCellSetSelection,
  useAnchors,
} from '../data-hooks';
import { getCellColors } from '../interpolate-colors';
import QRSupportingScatterplot from './QRSupportingScatterplot';
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
import { Component } from '../../app/constants';
import sum from 'lodash/sum';

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
 * @param {number} props.averageFillDensity Override the average fill density calculation
 * when using dynamic opacity mode.
 */
export default function QRSupportingScatterplotQuerySubscriber(props) {
  const {
    uuid,
    coordinationScopes,
    removeGridComponent,
    theme,
    disableTooltip = false,
    observationsLabelOverride: observationsLabel = 'cell',
    observationsPluralLabelOverride: observationsPluralLabel = `${observationsLabel}s`,
    title: titleOverride,
    // Average fill density for dynamic opacity calculation.
    averageFillDensity,
    zoomOffset = 1,
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
    geneExpressionColormap,
    geneExpressionColormapRange,
    anchorEditMode, // anchor edit mode
    anchorEditTool, // anchor edit tool. either 'lasso' or null.
    modelApiState,
    anchorApiState,
    anchorSetHighlight, // cell indices
    anchorSetFocus, // anchor set ID
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
    setGeneExpressionColormap,
    setGeneExpressionColormapRange,
    setAnchorSetHighlight,
  }] = useCoordination(
    COMPONENT_COORDINATION_TYPES[Component.QR_SUPPORTING_SCATTERPLOT_QUERY],
    coordinationScopes,
  );

  const [transitionInterpolator, setTransitionInterpolator] = useState(undefined);
  const [transitionDuration, setTransitionDuration] = useState(undefined);


  const modelIteration = modelApiState.iteration;
  const modelStatus = modelApiState.status;

  const anchorIteration = anchorApiState.iteration;
  const anchorStatus = anchorApiState.status;


  const [urls, addUrl, resetUrls] = useUrls();
  const [width, height, deckRef] = useDeckCanvasSize();
  const [
    isReady,
    setItemIsReady,
    setItemIsNotReady, // eslint-disable-line no-unused-vars
    resetReadyItems,
  ] = useReady([modelStatus, anchorStatus]);

  const isQuery = coordinationScopes.dataset === "QUERY";
  const title = isQuery ? `Supporting View (Query)` : '(Reference)';

  // Reset file URLs and loader progress when the dataset has changed.
  useEffect(() => {
    resetUrls();
    resetReadyItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, dataset]);

  const loader = loaders[dataset].loaders.cells;
  const options = loader?.options;

  // Load the data.
  // Cell IDs
  const [cellsIndex, genesIndex] = useAnnDataIndices(loaders, dataset, setItemIsReady, true);

  // Cell sets
  const [qryPrediction, qryPredictionStatus] = useAnnDataDynamic(loaders, dataset, options?.features?.prediction?.path, 'columnString', modelIteration, setItemIsReady, false);
  const [qryLabel, qryLabelStatus] = useAnnDataDynamic(loaders, dataset, options?.features?.label?.path, 'columnString', modelIteration, setItemIsReady, false);

  const cellSets = useCellSetsTree(cellsIndex, [qryPrediction, qryLabel], ["Prediction", "Label"]);

  // Embeddings
  const [embedding, embeddingStatus] = useAnnDataDynamic(loaders, dataset, options?.embeddings[mapping]?.path, 'embeddingNumeric', modelIteration, setItemIsReady, false);

  const [expressionData] = useGeneSelection(
    loaders, dataset, setItemIsReady, false, geneSelection, setItemIsNotReady,
  );
  const [attrs] = useExpressionAttrs(
    loaders, dataset, setItemIsReady, addUrl, false,
  );

  const [anchors, anchorsStatus] = useAnchors(loader, anchorIteration, setItemIsReady);

  useEffect(() => {
    // TODO(scXAI): debounce?
    if(anchors && anchorSetFocus && cellsIndex && embedding) {
      const anchorId = anchorSetFocus;
      const anchorGroup = Object.values(anchors).find(anchorSets => anchorSets.map(o => o.id).includes(anchorId));
      const anchorObj = anchorGroup.find(o => o.id === anchorId);
      const cellIds = anchorObj.cells.map(c => c.cell_id);
      const cellIndices = cellIds.map(cellId => cellsIndex.indexOf(cellId));

      const xVals = cellIndices.map(i => embedding.data[0][i]);
      const yVals = cellIndices.map(i => -embedding.data[1][i]);
      const xE = extent(xVals);
      const yE = extent(yVals);
      const xR = xE[1] - xE[0];
      const yR = yE[1] - yE[0];

      const newTargetX = sum(xVals) / xVals.length;
      const newTargetY = sum(yVals) / yVals.length;
      const newZoom = Math.log2(Math.min(width / xR, height / yR));

      setTransitionDuration(800);
      setTransitionInterpolator(new LinearInterpolator({ transitionProps: ['target', 'zoom'] }));

      setTargetX(newTargetX);
      // Graphics rendering has the y-axis going south so we need to multiply by negative one.
      setTargetY(newTargetY);
      setZoom(newZoom);
      setAnchorSetHighlight(cellIndices);
    }
  }, [anchorSetFocus]);
  
  const onTransitionEnd = useCallback((val) => {
    setTransitionDuration(undefined);
    setTransitionInterpolator(undefined);
  }, []);
  

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
    theme,
  }), [cellColorEncoding, geneSelection, mergedCellSets, theme,
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
      && embedding
      && cellsIndex
      && cellSetColor?.length) {
      const newCellSetPolygons = getCellSetPolygons({
        cells: cellsIndex,
        embedding: embedding,
        cellSets: mergedCellSets,
        cellSetSelection,
        cellSetColor,
        theme,
      });
      setCellSetPolygonCache(cache => [...cache, [cellSetSelection, newCellSetPolygons]]);
      return newCellSetPolygons;
    }
    return cacheGet(cellSetPolygonCache, cellSetSelection) || [];
  }, [cellSetPolygonsVisible, cellSetPolygonCache, cellSetLabelsVisible, theme,
    cellsIndex, embedding, mapping, mergedCellSets, cellSetSelection, cellSetColor]);


  const cellSelection = useMemo(() => Array.from(cellColors.keys()), [cellColors]);

  const [xRange, yRange, xExtent, yExtent, numCells] = useMemo(() => {
    const cellValues = embedding;
    if (cellValues?.data) {
      const xVals = embedding.data.map(d => d[0]);
      const yVals = embedding.data.map(d => d[1]);
      const xE = extent(xVals);
      const yE = extent(yVals);
      const xR = xE[1] - xE[0];
      const yR = yE[1] - yE[0];
      return [xR, yR, xE, yE, cellValues.shape[1]];
    }
    return [null, null, null, null, null];
  }, [embedding, mapping]);

  // After cells have loaded or changed,
  // compute the cell radius scale based on the
  // extents of the cell coordinates on the x/y axes.
  useEffect(() => {
    if (xRange && yRange) {
      const pointSizeDevicePixels = getPointSizeDevicePixels(
        window.devicePixelRatio, zoom, xRange, yRange, width, height,
      );
      setDynamicCellRadius(pointSizeDevicePixels);

      const nextCellOpacityScale = getPointOpacity(
        zoom, xRange, yRange, width, height, numCells, averageFillDensity,
      );
      setDynamicCellOpacity(nextCellOpacityScale);

      if (typeof targetX !== 'number' || typeof targetY !== 'number') {
        const newTargetX = xExtent[0] + xRange / 2;
        const newTargetY = yExtent[0] + yRange / 2;
        const newZoom = Math.log2(Math.min(width / xRange, height / yRange));
        setTargetX(newTargetX);
        // Graphics rendering has the y-axis going south so we need to multiply by negative one.
        setTargetY(-newTargetY);
        setZoom(newZoom + zoomOffset);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xRange, yRange, xExtent, yExtent, numCells, mapping,
    width, height, zoom, averageFillDensity, zoomOffset]);

  const getCellInfo = useCallback((cellId) => {
    //const cellInfo = cells[cellId];
    const cellInfo = {};
    return {
      [`${capitalize(observationsLabel)} ID`]: cellId,
      ...(cellInfo ? cellInfo.factors : {}),
    };
  }, [observationsLabel]);

  const cellSelectionSet = useMemo(() => new Set(cellSelection), [cellSelection]);
  const getCellIsSelected = useCallback(cellEntry => (
    (cellSelectionSet || new Set([])).has(cellEntry) ? 1.0 : 0.0), [cellSelectionSet]);

  const cellRadius = (cellRadiusMode === 'manual' ? cellRadiusFixed : dynamicCellRadius);
  const cellOpacity = (cellOpacityMode === 'manual' ? cellOpacityFixed : dynamicCellOpacity);

  // Set up a getter function for gene expression values, to be used
  // by the DeckGL layer to obtain values for instanced attributes.
  const getExpressionValue = useExpressionValueGetter({ attrs, expressionData });

  return (
    <TitleInfo
      title={title}
      info={`${numCells} ${pluralize(observationsLabel, observationsPluralLabel, numCells)}`}
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
          geneExpressionColormap={geneExpressionColormap}
          setGeneExpressionColormap={setGeneExpressionColormap}
          geneExpressionColormapRange={geneExpressionColormapRange}
          setGeneExpressionColormapRange={setGeneExpressionColormapRange}
        />
      )}
    >
      <QRSupportingScatterplot
        ref={deckRef}
        uuid={uuid}
        theme={theme}
        viewState={{
          zoom,
          target: [targetX, targetY, targetZ],
          transitionDuration,
          transitionInterpolator,
          transitionInterruption: TRANSITION_EVENTS.IGNORE,
          onTransitionEnd
        }}
        setViewState={({ zoom: newZoom, target }) => {
          setZoom(newZoom);
          setTargetX(target[0]);
          setTargetY(target[1]);
          setTargetZ(target[2] || 0);
        }}
        anchorEditTool={anchorEditTool}
        anchorSetFocus={anchorSetFocus}
        anchorSetHighlight={anchorSetHighlight}
        cellsIndex={cellsIndex}
        embedding={embedding}
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
        geneExpressionColormap={geneExpressionColormap}
        geneExpressionColormapRange={geneExpressionColormapRange}
        setComponentHover={() => {
          setComponentHover(uuid);
        }}
        updateViewInfo={setComponentViewInfo}
        getExpressionValue={getExpressionValue}
        getCellIsSelected={getCellIsSelected}

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
