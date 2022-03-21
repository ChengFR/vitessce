/* eslint-disable */
import React, { forwardRef } from 'react';
import { COORDINATE_SYSTEM } from '@deck.gl/core'; // eslint-disable-line import/no-extraneous-dependencies
import { PolygonLayer, TextLayer, ScatterplotLayer, PointCloudLayer, LineLayer } from '@deck.gl/layers'; // eslint-disable-line import/no-extraneous-dependencies
import { HeatmapLayer, ContourLayer } from '@deck.gl/aggregation-layers'; // eslint-disable-line import/no-extraneous-dependencies
import { forceSimulation } from 'd3-force';
import bboxPolygon from '@turf/bbox-polygon';
import { getSelectionLayers } from '../../layers';
import { cellLayerDefaultProps, getDefaultColor } from '../utils';
import {
  createCellsQuadTree,
} from '../shared-spatial-scatterplot/quadtree';
import AbstractSpatialOrScatterplot from '../shared-spatial-scatterplot/AbstractSpatialOrScatterplot';
import { forceCollideRects } from '../shared-spatial-scatterplot/force-collide-rects';
import { ScaledExpressionExtension, SelectionExtension } from '../../layer-extensions';
import { Matrix4 } from "@math.gl/core";

const REF_LAYER_ID = 'ref-scatterplot';
const QRY_LAYER_ID = 'qry-scatterplot';
const LABEL_FONT_FAMILY = "-apple-system, 'Helvetica Neue', Arial, sans-serif";
const NUM_FORCE_SIMULATION_TICKS = 100;
const LABEL_UPDATE_ZOOM_DELTA = 0.25;

// Default getter function props.
const makeDefaultGetCellPosition = (mapping, zVal) => (cellEntry) => {
  const { mappings } = cellEntry[1];
  if (!(mapping in mappings)) {
    const available = Object.keys(mappings).map(s => `"${s}"`).join(', ');
    throw new Error(`Expected to find "${mapping}", but available mappings are: ${available}`);
  }
  const mappedCell = mappings[mapping];
  // The negative applied to the y-axis is because
  // graphics rendering has the y-axis positive going south.
  return [mappedCell[0], -mappedCell[1], zVal];
};
const makeDefaultGetCellCoords = mapping => cell => cell.mappings[mapping];
const makeDefaultGetCellColors = (cellColors, qryCellsIndex, theme) => (cellEntry, { index }) => {
  const [r, g, b, a] = (cellColors && qryCellsIndex && cellColors.get(qryCellsIndex[index])) || getDefaultColor(theme);
  return [r, g, b, 255 * (a || 1)];
};

/**
 * React component which renders a scatterplot from cell data, typically tSNE or PCA.
 * @param {object} props
 * @param {string} props.uuid A unique identifier for this component.
 * @param {string} props.theme The current vitessce theme.
 * @param {object} props.viewState The deck.gl view state.
 * @param {function} props.setViewState Function to call to update the deck.gl view state.
 * @param {object} props.cells
 * @param {string} props.mapping The name of the coordinate mapping field,
 * for each cell, for example "PCA" or "t-SNE".
 * @param {Map} props.refCellColors Mapping of reference cell IDs to colors.
 * @param {Map} props.qryCellColors Mapping of query cell IDs to colors.
 * @param {array} props.cellSelection Array of selected cell IDs.
 * @param {array} props.cellFilter Array of filtered cell IDs. By default, null.
 * @param {number} props.cellRadius The value for `radiusScale` to pass
 * to the deck.gl cells ScatterplotLayer.
 * @param {number} props.cellOpacity The value for `opacity` to pass
 * to the deck.gl cells ScatterplotLayer.
 * @param {function} props.getCellCoords Getter function for cell coordinates
 * (used by the selection layer).
 * @param {function} props.getCellPosition Getter function for cell [x, y, z] position.
 * @param {function} props.getCellColor Getter function for cell color as [r, g, b] array.
 * @param {function} props.getCellIsSelected Getter function for cell layer isSelected.
 * @param {function} props.setCellSelection
 * @param {function} props.setCellHighlight
 * @param {function} props.updateViewInfo
 * @param {function} props.onToolChange Callback for tool changes
 * (lasso/pan/rectangle selection tools).
 * @param {function} props.onCellClick Getter function for cell layer onClick.
 */
class QRComparisonScatterplot extends AbstractSpatialOrScatterplot {
  constructor(props) {
    super(props);

    // To avoid storing large arrays/objects
    // in React state, this component
    // uses instance variables.
    // All instance variables used in this class:
    this.qryCellsEntries = {};
    this.qryCellsQuadTree = null;
    this.refCellsEntries = {};
    this.refCellsQuadTree = null;

    // Layer storage
    this.refHeatmapLayers = [];
    this.refContourLayers = [];
    this.refScatterplotLayer = null;
    this.refContourFocusLayers = [];
    this.qryHeatmapLayers = [];
    this.qryContourLayers = [];
    this.qryScatterplotLayer = null;
    this.qryContourFocusLayers = [];

    this.supportingBoundsLayer = null;
    this.anchorLinksLayers = [];

    this.cellSetsForceSimulation = forceCollideRects();
    this.cellSetsLabelPrevZoom = null;
    this.cellSetsLayers = [];

    // Initialize data and layers.
    this.onUpdateRefCellsData();
    this.onUpdateQryCellsData();

    // Layer updates
    this.onUpdateRefHeatmapLayer();
    this.onUpdateRefContourLayer();
    this.onUpdateRefScatterplotLayer();
    this.onUpdateQryHeatmapLayer();
    this.onUpdateQryContourLayer();
    this.onUpdateQryScatterplotLayer();

    this.onUpdateCellSetsLayers();
    this.onUpdateSupportingBoundsLayer();
    this.onUpdateAnchorLinksLayer();
  }

  createRefHeatmapLayers() {
    const {
      refCellsEntries: cellsEntries
    } = this;
    const {
      refContour,
      refCellsVisible,
      refCellEncoding,
      theme,
      cellRadius = 1.0,
      cellOpacity = 1.0,
      cellFilter,
      cellSelection,
      setCellHighlight,
      setComponentHover,
      getCellIsSelected,
      cellColors,
      refCellsIndex,
      getCellColor = makeDefaultGetCellColors(cellColors, refCellsIndex, theme),
      getExpressionValue,
      onCellClick,
      geneExpressionColormap,
      geneExpressionColormapRange = [0.0, 1.0],
      cellColorEncoding,
    } = this.props;
    const filteredCellsEntries = (cellFilter
      ? cellsEntries.filter(cellEntry => cellFilter.includes(cellEntry[0]))
      : cellsEntries);
    return refContour.map(group => {
      const { name, colorRange, indices } = group;
      return new HeatmapLayer({
        id: `${REF_LAYER_ID}-heatmap-${name}`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: {
          src: { indices, embedding: cellsEntries.data },
          length: indices.length
        },
        visible: (refCellsVisible && refCellEncoding === 'heatmap'),
        pickable: true,
        autoHighlight: true,
        filled: true,
        radiusPixels: 40,
        radiusScale: cellRadius,
        radiusMinPixels: 1,
        radiusMaxPixels: 30,
        colorRange: colorRange,
        getPolygonOffset: () => ([0, 90]),
        //modelMatrix: new Matrix4().makeTranslation(0, 0, 1),
        // Our radius pixel setters measure in pixels.
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getPosition: (object, { index, data, target }) => {
          target[0] = data.src.embedding[0][data.src.indices[index]];
          target[1] = -data.src.embedding[1][data.src.indices[index]];
          target[2] = 0;
          return target;
        },
        getPointRadius: 1,
        getExpressionValue,
        getLineWidth: 0,
        colorScaleLo: geneExpressionColormapRange[0],
        colorScaleHi: geneExpressionColormapRange[1],
        isExpressionMode: (cellColorEncoding === 'geneSelection'),
        colormap: geneExpressionColormap,
        updateTriggers: {
          getExpressionValue,
          getFillColor: [cellColorEncoding, cellSelection, cellColors],
          getLineColor: [cellColorEncoding, cellSelection, cellColors],
          getCellIsSelected,
        },
      });
    });
  }

  createRefContourLayers() {
    const {
      refCellsEntries: cellsEntries
    } = this;
    const {
      refContour,
      refCellsVisible,
      refCellEncoding,
    } = this.props;

    return refContour.map(group => {
      const { name, color, indices } = group;
      const strokeColor = [...color];
      strokeColor[3] = 0.5 * 255;
      const fillColor = [...color];
      fillColor[3] = 0.2 * 255;

      return new ContourLayer({
        id: `${REF_LAYER_ID}-contour-${name}`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: {
          src: { indices, embedding: cellsEntries.data },
          length: indices.length
        },
        visible: (refCellsVisible && refCellEncoding === 'contour'),
        pickable: false,
        autoHighlight: false,
        filled: true,
        getPolygonOffset: () => ([0, 20]),
        cellSize: 0.3,
        contours: [
          { threshold: 3, color: strokeColor, strokeWidth: 2 },
          { threshold: [3, 1000], color: fillColor },
          // { threshold: [10, 1000], color: color },
          // { threshold: [30, 1000], color: color }
        ],
        getPosition: (object, { index, data, target }) => {
          target[0] = data.src.embedding[0][data.src.indices[index]];
          target[1] = -data.src.embedding[1][data.src.indices[index]];
          target[2] = 0;
          return target;
        },
      })
    });
  }


  createRefScatterplotLayer() {
    const { refCellsEntries: cellsEntries } = this;
    const {
      refCellsVisible,
      refCellEncoding,
      theme,
      cellRadius = 1.0,
      cellOpacity = 1.0,
      cellFilter,
      cellSelection,
      setCellHighlight,
      setComponentHover,
      getCellIsSelected,
      refCellsIndex,
      refCellColors,
      getCellColor = makeDefaultGetCellColors(refCellColors, refCellsIndex, theme),
      getExpressionValue,
      onCellClick,
      geneExpressionColormap,
      geneExpressionColormapRange = [0.0, 1.0],
      cellColorEncoding,
    } = this.props;
    const filteredCellsEntries = (cellFilter
      ? cellsEntries.filter(cellEntry => cellFilter.includes(cellEntry[0]))
      : cellsEntries);
    return new ScatterplotLayer({
      id: `${REF_LAYER_ID}-scatterplot`,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: {
        src: cellsEntries.data,
        length: cellsEntries.shape[1]
      },
      visible: (refCellsVisible && refCellEncoding === 'scatterplot'),
      pickable: false,
      autoHighlight: false,
      stroked: false,
      filled: true,
      opacity: cellOpacity,
      radiusScale: cellRadius, // TODO: fix upstream
      radiusMinPixels: 1,
      radiusMaxPixels: 30,
      // Reference: http://pessimistress.github.io/deck.gl/docs/api-reference/core/layer#getpolygonoffset
      getPolygonOffset: () => ([0, -90]), // TODO: determine optimal value
      // Our radius pixel setters measure in pixels.
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      getPosition: (object, { index, data, target }) => {
        target[0] = data.src[0][index];
        target[1] = -data.src[1][index];
        target[2] = 0;
        return target;
      },
      getFillColor: getCellColor,
      getPointRadius: 1,
      getExpressionValue,
      getLineWidth: 0,
      colorScaleLo: geneExpressionColormapRange[0],
      colorScaleHi: geneExpressionColormapRange[1],
      isExpressionMode: (cellColorEncoding === 'geneSelection'),
      colormap: geneExpressionColormap,
      onClick: (info) => {
        if (onCellClick) {
          onCellClick(info);
        }
      },
      updateTriggers: {
        getExpressionValue,
        getFillColor: [cellColorEncoding, cellSelection, refCellColors],
        getLineColor: [cellColorEncoding, cellSelection, refCellColors],
        getCellIsSelected,
      },
    });
  }

  createQryHeatmapLayers() {
    const {
      qryCellsEntries: cellsEntries
    } = this;
    const {
      qryCellsVisible,
      qryCellEncoding,
      theme,
      cellRadius = 1.0,
      cellOpacity = 1.0,
      cellFilter,
      cellSelection,
      setCellHighlight,
      setComponentHover,
      getCellIsSelected,
      cellColors,
      qryCellsIndex,
      getCellColor = makeDefaultGetCellColors(cellColors, qryCellsIndex, theme),
      getExpressionValue,
      onCellClick,
      geneExpressionColormap,
      geneExpressionColormapRange = [0.0, 1.0],
      cellColorEncoding,
    } = this.props;
    const filteredCellsEntries = (cellFilter
      ? cellsEntries.filter(cellEntry => cellFilter.includes(cellEntry[0]))
      : cellsEntries);
    return [
      new HeatmapLayer({
        id: `${QRY_LAYER_ID}-heatmap`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: {
          src: cellsEntries.data,
          length: cellsEntries.shape[1]
        },
        visible: (qryCellsVisible && qryCellEncoding === 'heatmap'),
        pickable: true,
        autoHighlight: true,
        filled: true,
        radiusPixels: 40,
        radiusScale: cellRadius,
        radiusMinPixels: 1,
        radiusMaxPixels: 30,
        colorRange: [
          [241, 241, 241, 128],
          [217, 217, 217, 128],
          [217, 217, 217, 128],
          [217, 217, 217, 128],
          [217, 217, 217, 128],
        ],
        getPolygonOffset: () => ([0, 80]),
        //modelMatrix: new Matrix4().makeTranslation(0, 0, 1),
        // Our radius pixel setters measure in pixels.
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getPosition: (object, { index, data, target }) => {
          target[0] = data.src[0][index];
          target[1] = -data.src[1][index];
          target[2] = 0;
          return target;
        },
        getFillColor: getCellColor,
        getLineColor: getCellColor,
        getPointRadius: 1,
        getExpressionValue,
        getLineWidth: 0,
        colorScaleLo: geneExpressionColormapRange[0],
        colorScaleHi: geneExpressionColormapRange[1],
        isExpressionMode: (cellColorEncoding === 'geneSelection'),
        colormap: geneExpressionColormap,
        updateTriggers: {
          getExpressionValue,
          getFillColor: [cellColorEncoding, cellSelection, cellColors],
          getLineColor: [cellColorEncoding, cellSelection, cellColors],
          getCellIsSelected,
        },
      }),
    ];
  }

  createQryContourLayers() {
    const {
      qryCellsEntries: cellsEntries
    } = this;
    const {
      qryContour,
      qryCellsVisible,
      qryCellEncoding,
    } = this.props;

    return qryContour.map(group => {
      const { name, color, indices } = group;
      const strokeColor = [...color];
      strokeColor[3] = 0.5 * 255;
      const fillColor = [...color];
      fillColor[3] = 0.2 * 255;

      return new ContourLayer({
        id: `${QRY_LAYER_ID}-contour-${name}`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: {
          src: { indices, embedding: cellsEntries.data },
          length: indices.length
        },
        visible: (qryCellsVisible && qryCellEncoding === 'contour'),
        pickable: false,
        autoHighlight: false,
        filled: true,
        getPolygonOffset: () => ([0, 10]),
        cellSize: 0.3,
        contours: [
          { threshold: 3, color: strokeColor, strokeWidth: 2 },
          { threshold: [3, 1000], color: fillColor },
          // { threshold: [10, 1000], color: color },
          // { threshold: [30, 1000], color: color }
        ],
        getPosition: (object, { index, data, target }) => {
          target[0] = data.src.embedding[0][data.src.indices[index]];
          target[1] = -data.src.embedding[1][data.src.indices[index]];
          target[2] = 0;
          return target;
        },
      })
    });
  }

  createQryContourFocusLayers() {
    const {
      qryCellsEntries: cellsEntries
    } = this;
    const {
      qryAnchorSetFocusContour,
    } = this.props;

    return qryAnchorSetFocusContour.map(group => {
      const { name, color, indices } = group;
      const strokeColor = [...color];
      strokeColor[3] = 0.5 * 255;
      const fillColor = [...color];
      fillColor[3] = 0.2 * 255;

      return new ContourLayer({
        id: `${QRY_LAYER_ID}-contour-focus-${name}`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: {
          src: { indices, embedding: cellsEntries.data },
          length: indices.length
        },
        visible: true,
        pickable: false,
        autoHighlight: false,
        filled: true,
        getPolygonOffset: () => ([0, 8]),
        cellSize: 0.3,
        contours: [
          { threshold: 3, color: strokeColor, strokeWidth: 2 },
          { threshold: [3, 1000], color: fillColor },
          // { threshold: [10, 1000], color: color },
          // { threshold: [30, 1000], color: color }
        ],
        getPosition: (object, { index, data, target }) => {
          target[0] = data.src.embedding[0][data.src.indices[index]];
          target[1] = -data.src.embedding[1][data.src.indices[index]];
          target[2] = 0;
          return target;
        },
      })
    });
  }

  createRefContourFocusLayers() {
    const {
      refCellsEntries: cellsEntries
    } = this;
    const {
      refAnchorSetFocusContour,
    } = this.props;

    return refAnchorSetFocusContour.map(group => {
      const { name, color, indices } = group;
      const strokeColor = [...color];
      strokeColor[3] = 0.5 * 255;
      const fillColor = [...color];
      fillColor[3] = 0.2 * 255;

      return new ContourLayer({
        id: `${REF_LAYER_ID}-contour-focus-${name}`,
        coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
        data: {
          src: { indices, embedding: cellsEntries.data },
          length: indices.length
        },
        visible: true,
        pickable: false,
        autoHighlight: false,
        filled: true,
        getPolygonOffset: () => ([0, 9]),
        cellSize: 0.3,
        contours: [
          { threshold: 3, color: strokeColor, strokeWidth: 2 },
          { threshold: [3, 1000], color: fillColor },
          // { threshold: [10, 1000], color: color },
          // { threshold: [30, 1000], color: color }
        ],
        getPosition: (object, { index, data, target }) => {
          target[0] = data.src.embedding[0][data.src.indices[index]];
          target[1] = -data.src.embedding[1][data.src.indices[index]];
          target[2] = 0;
          return target;
        },
      })
    });
  }

  createQryScatterplotLayer() {
    const { qryCellsEntries: cellsEntries } = this;
    const {
      qryCellsVisible,
      qryCellEncoding,
      theme,
      cellRadius = 1.0,
      cellOpacity = 1.0,
      cellFilter,
      cellSelection,
      setCellHighlight,
      setComponentHover,
      getCellIsSelected,
      qryCellsIndex,
      qryCellColors,
      getCellColor = makeDefaultGetCellColors(qryCellColors, qryCellsIndex, theme),
      getExpressionValue,
      onCellClick,
      geneExpressionColormap,
      geneExpressionColormapRange = [0.0, 1.0],
      cellColorEncoding,
    } = this.props;
    const filteredCellsEntries = (cellFilter
      ? cellsEntries.filter(cellEntry => cellFilter.includes(cellEntry[0]))
      : cellsEntries);
    return new ScatterplotLayer({
      id: QRY_LAYER_ID,
      coordinateSystem: COORDINATE_SYSTEM.CARTESIAN,
      data: {
        src: cellsEntries.data,
        length: cellsEntries.shape[1]
      },
      visible: (qryCellsVisible && qryCellEncoding === 'scatterplot'),
      pickable: true,
      autoHighlight: true,
      stroked: false,
      filled: true,
      opacity: cellOpacity,
      radiusScale: cellRadius, // TODO: fix upstream
      radiusMinPixels: 1,
      radiusMaxPixels: 30,
      // Reference: http://pessimistress.github.io/deck.gl/docs/api-reference/core/layer#getpolygonoffset
      getPolygonOffset: () => ([0, -100]), // TODO: determine optimal value
      // Our radius pixel setters measure in pixels.
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      getPosition: (object, { index, data, target }) => {
        target[0] = data.src[0][index];
        target[1] = -data.src[1][index];
        target[2] = 0;
        return target;
      },
      getFillColor: getCellColor,
      getPointRadius: 1,
      getExpressionValue,
      getLineWidth: 0,
      colorScaleLo: geneExpressionColormapRange[0],
      colorScaleHi: geneExpressionColormapRange[1],
      isExpressionMode: (cellColorEncoding === 'geneSelection'),
      colormap: geneExpressionColormap,
      onClick: (info) => {
        if (onCellClick) {
          onCellClick(info);
        }
      },
      updateTriggers: {
        getExpressionValue,
        getFillColor: [cellColorEncoding, cellSelection, qryCellColors],
        getLineColor: [cellColorEncoding, cellSelection, qryCellColors],
        getCellIsSelected,
      },
    });
  }

  createSupportingBoundsLayer() {
    const { qrySupportingBounds, refSupportingBounds } = this.props;
    return new PolygonLayer({
      id: 'supporting-bounds',
      data: [
        ...(qrySupportingBounds ? [bboxPolygon(qrySupportingBounds).geometry.coordinates] : []),
        ...(refSupportingBounds ? [bboxPolygon(refSupportingBounds).geometry.coordinates] : []),
      ],
      pickable: false,
      stroked: true,
      filled: false,
      wireframe: true,
      lineWidthMaxPixels: 2,
      getPolygon: d => d,
      getLineColor: (object, { index }) => {
        if(index === 0) {
          return [105, 105, 105];
        } else {
          return [211, 211, 211];
        }
      },
      getLineWidth: 1,
    });
  }

  createAnchorLinksLayers() {
    const {
      anchorLinks,
      anchorLinksVisible,
      qryAnchorSetFocus,
      refAnchorSetFocus,
      cellRadius,
    } = this.props;
    return [
      // Lines
      new LineLayer({
        id: 'anchor-links',
        data: anchorLinks,
        visible: anchorLinksVisible,
        pickable: false,
        widthUnits: 'pixels',
        widthScale: 1,
        getWidth: d => {
          if(d.qryId === qryAnchorSetFocus && d.refId === refAnchorSetFocus) {
            return 5;
          }
          return 2;
        },
        getPolygonOffset: () => ([0, -200]), // TODO: determine optimal value
        getSourcePosition: d => [d.qry[0], -d.qry[1]],
        getTargetPosition: d => [d.ref[0], -d.ref[1]],
        getColor: d => [140, 140, 140],
        updateTriggers: {
          getWidth: [qryAnchorSetFocus, refAnchorSetFocus],
        },
      }),
      // Line endpoints
      new ScatterplotLayer({
        id: 'anchor-link-endpoints',
        data: [
          ...anchorLinks.map(d => ({ coordinate: d.qry, type: 'qry' })),
          ...anchorLinks.map(d => ({ coordinate: d.ref, type: 'ref' })),
        ],
        visible: anchorLinksVisible,
        pickable: false,
        stroked: true,
        filled: true,
        getPolygonOffset: () => ([0, -300]), // TODO: determine optimal value
        opacity: 1,
        radiusScale: 1,
        radiusMinPixels: 1,
        radiusMaxPixels: 30,
        radiusUnits: 'pixels',
        lineWidthUnits: 'pixels',
        getPosition: d => [d.coordinate[0], -d.coordinate[1], 0],
        getFillColor: d => d.type === 'qry' ? [105, 105, 105] : [211, 211, 211],
        getLineColor: [60, 60, 60],
        getRadius: d => {
          if(d.qryId === qryAnchorSetFocus && d.refId === refAnchorSetFocus) {
            return 10;
          }
          return 5;
        },
        getLineWidth: d => {
          if(d.qryId === qryAnchorSetFocus && d.refId === refAnchorSetFocus) {
            return 2;
          }
          return 0;
        },
        updateTriggers: {
          getLineWidth: [qryAnchorSetFocus, refAnchorSetFocus],
          getRadius: [qryAnchorSetFocus, refAnchorSetFocus],
        },
      }),
    ];
  }

  createCellSetsLayers() {
    const {
      theme,
      cellSetPolygons,
      viewState,
      cellSetPolygonsVisible,
      cellSetLabelsVisible,
      cellSetLabelSize,
    } = this.props;

    const result = [];

    if (cellSetPolygonsVisible) {
      result.push(new PolygonLayer({
        id: 'cell-sets-polygon-layer',
        data: cellSetPolygons,
        stroked: true,
        filled: false,
        wireframe: true,
        lineWidthMaxPixels: 1,
        getPolygon: d => d.hull,
        getLineColor: d => d.color,
        getLineWidth: 1,
      }));
    }

    if (cellSetLabelsVisible) {
      const { zoom } = viewState;
      const nodes = cellSetPolygons.map(p => ({
        x: p.centroid[0],
        y: p.centroid[1],
        label: p.name,
      }));

      const collisionForce = this.cellSetsForceSimulation
        .size(d => ([
          cellSetLabelSize * 1 / (2 ** zoom) * 4 * d.label.length,
          cellSetLabelSize * 1 / (2 ** zoom) * 1.5,
        ]));

      forceSimulation()
        .nodes(nodes)
        .force('collision', collisionForce)
        .tick(NUM_FORCE_SIMULATION_TICKS);

      result.push(new TextLayer({
        id: 'cell-sets-text-layer',
        data: nodes,
        getPosition: d => ([d.x, d.y]),
        getText: d => d.label,
        getColor: (theme === 'dark' ? [255, 255, 255] : [0, 0, 0]),
        getSize: cellSetLabelSize,
        getAngle: 0,
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        fontFamily: LABEL_FONT_FAMILY,
        fontWeight: 'normal',
      }));
    }

    return result;
  }

  createQrySelectionLayers() {
    const { qryCellsEntries: cellsEntries } = this;
    const {
      viewState,
      setCellSelection,
      qryCellsIndex,
    } = this.props;
    const tool = super.getTool();
    const { qryCellsQuadTree: cellsQuadTree } = this;
    const flipYTooltip = true;
    
    const getCellCoords = (i) => ([cellsEntries.data[0][i], cellsEntries.data[1][i], 0]);

    return getSelectionLayers(
      tool,
      viewState.zoom,
      QRY_LAYER_ID,
      getCellCoords,
      qryCellsIndex,
      setCellSelection,
      cellsQuadTree,
      flipYTooltip,
    );
  }

  getLayers() {
    const {
      refHeatmapLayers,
      refContourLayers,
      refScatterplotLayer,
      refContourFocusLayers,
      qryHeatmapLayers,
      qryContourLayers,
      qryScatterplotLayer,
      qryContourFocusLayers,
      //cellSetsLayers,
      supportingBoundsLayer,
      anchorLinksLayers,
    } = this;
    return [
      anchorLinksLayers,
      supportingBoundsLayer,
      qryScatterplotLayer,
      //refScatterplotLayer,
      //...qryHeatmapLayers,
      ...refHeatmapLayers,
      ...qryContourFocusLayers,
      //...qryContourLayers,
      ...refContourFocusLayers,
      //...refContourLayers,
      //...cellSetsLayers,
      ...this.createQrySelectionLayers(),
    ];
  }

  onUpdateQryCellsData() {
    const {
      qryEmbedding,
    } = this.props;
    if(qryEmbedding && qryEmbedding.data) {
      this.qryCellsEntries = qryEmbedding;
      this.qryCellsQuadTree = createCellsQuadTree(qryEmbedding);
    }
  }

  onUpdateRefCellsData() {
    const {
      refEmbedding,
    } = this.props;
    if (refEmbedding && refEmbedding.data) {
      this.refCellsEntries = refEmbedding;
      this.refCellsQuadTree = createCellsQuadTree(refEmbedding);
    }
  }

  onUpdateQryHeatmapLayer() {
    if(this.qryCellsEntries.data && this.props.qryContour) {
      this.qryHeatmapLayers = this.createQryHeatmapLayers();
    }
  }

  onUpdateQryContourLayer() {
    if (this.qryCellsEntries.data && this.props.qryContour) {
      this.qryContourLayers = this.createQryContourLayers();
    }
  }
  
  onUpdateQryContourFocusLayer() {
    if (this.qryCellsEntries.data && this.props.qryAnchorSetFocusContour) {
      this.qryContourFocusLayers = this.createQryContourFocusLayers();
    }
  }
  onUpdateRefContourFocusLayer() {
    if (this.refCellsEntries.data && this.props.refAnchorSetFocusContour) {
      this.refContourFocusLayers = this.createRefContourFocusLayers();
    }
  }

  onUpdateQryScatterplotLayer() {
    if(this.qryCellsEntries.data) {
      this.qryScatterplotLayer = this.createQryScatterplotLayer();
    }
  }

  onUpdateRefHeatmapLayer() {
    if(this.refCellsEntries.data && this.props.refContour) {
      this.refHeatmapLayers = this.createRefHeatmapLayers();
    }
  }

  onUpdateRefContourLayer() {
    if (this.refCellsEntries.data && this.props.refContour) {
      this.refContourLayers = this.createRefContourLayers();
    }
  }

  onUpdateRefScatterplotLayer() {
    if(this.refCellsEntries.data) {
      this.refScatterplotLayer = this.createRefScatterplotLayer();
    }
  }

  onUpdateSupportingBoundsLayer() {
    const { qrySupportingBounds, refSupportingBounds } = this.props;
    if(qrySupportingBounds || refSupportingBounds) {
      this.supportingBoundsLayer = this.createSupportingBoundsLayer();
    }
  }

  onUpdateAnchorLinksLayer() {
    const { anchorLinksVisible, anchorLinks } = this.props;
    if(anchorLinks) {
      this.anchorLinksLayers = this.createAnchorLinksLayers();
    }
  }

  onUpdateCellSetsLayers(onlyViewStateChange) {
    // Because the label sizes for the force simulation depend on the zoom level,
    // we _could_ run the simulation every time the zoom level changes.
    // However, this has a performance impact in firefox.
    if (onlyViewStateChange) {
      const { viewState, cellSetLabelsVisible } = this.props;
      const { zoom } = viewState;
      const { cellSetsLabelPrevZoom } = this;
      // Instead, we can just check if the zoom level has changed
      // by some relatively large delta, to be more conservative
      // about re-running the force simulation.
      if (cellSetLabelsVisible
        && (
          cellSetsLabelPrevZoom === null
          || Math.abs(cellSetsLabelPrevZoom - zoom) > LABEL_UPDATE_ZOOM_DELTA
        )
      ) {
        this.cellSetsLayers = this.createCellSetsLayers();
        this.cellSetsLabelPrevZoom = zoom;
      }
    } else {
      // Otherwise, something more substantial than just
      // the viewState has changed, such as the label array
      // itself, so we always want to update the layer
      // in this case.
      this.cellSetsLayers = this.createCellSetsLayers();
    }
  }

  viewInfoDidUpdate() {
    const {
      qryCells: cells,
      qryMapping: mapping,
      getCellPosition = makeDefaultGetCellPosition(mapping, 0),
      updateViewInfo,
      uuid,
    } = this.props;
    const { viewport } = this;

    // TODO(scXAI): update
    const getCellCoords = cell => getCellPosition([null, cell]);
    
    if (updateViewInfo && viewport) {
      updateViewInfo({
        uuid,
        project: (cellId) => {
          const cell = cells[cellId];
          try {
            const [positionX, positionY] = getCellCoords(cell);
            return viewport.project([positionX, positionY]);
          } catch (e) {
            return [null, null];
          }
        },
      });
    }
  }

  /**
   * Here, asynchronously check whether props have
   * updated which require re-computing memoized variables,
   * followed by a re-render.
   * This function does not follow React conventions or paradigms,
   * it is only implemented this way to try to squeeze out
   * performance.
   * @param {object} prevProps The previous props to diff against.
   */
  componentDidUpdate(prevProps) {
    this.viewInfoDidUpdate();

    const shallowDiff = propName => (prevProps[propName] !== this.props[propName]);
    if (['qryEmbedding', 'qryContour'].some(shallowDiff)) {
      // Cells data changed.
      this.onUpdateQryCellsData();
      this.onUpdateQryHeatmapLayer();
      this.onUpdateQryContourLayer();
      this.forceUpdate();
    }
    if (['refEmbedding', 'refContour'].some(shallowDiff)) {
      // Cells data changed.
      this.onUpdateRefCellsData();
      this.onUpdateRefHeatmapLayer();
      this.onUpdateRefContourLayer();
      this.forceUpdate();
    }
    if (['refCellsVisible', 'refCellEncoding'].some(shallowDiff)) {
      this.onUpdateRefHeatmapLayer();
      this.onUpdateRefContourLayer();
      this.onUpdateRefScatterplotLayer();
      this.forceUpdate();
    }
    if (['qryCellsVisible', 'qryCellEncoding'].some(shallowDiff)) {
      this.onUpdateQryHeatmapLayer();
      this.onUpdateQryContourLayer();
      this.onUpdateQryScatterplotLayer();
      this.forceUpdate();
    }

    if ([
      'qryEmbedding', 'refEmbedding', 'cellFilter', 'cellSelection', 'cellColors',
      'cellRadius', 'cellOpacity', 'cellRadiusMode', 'geneExpressionColormap',
      'geneExpressionColormapRange', 'geneSelection', 'cellColorEncoding',
    ].some(shallowDiff)) {
      // Cells layer props changed.
      this.onUpdateQryScatterplotLayer();
      this.onUpdateRefHeatmapLayer();
      this.forceUpdate();
    }
    if ([
      'cellSetPolygons', 'cellSetPolygonsVisible',
      'cellSetLabelsVisible', 'cellSetLabelSize',
    ].some(shallowDiff)) {
      // Cell sets layer props changed.
      this.onUpdateCellSetsLayers(false);
      this.forceUpdate();
    }
    if (shallowDiff('viewState')) {
      // The viewState prop has changed (due to zoom or pan).
      this.onUpdateCellSetsLayers(true);
      this.forceUpdate();
    }
    if (['qrySupportingBounds', 'refSupportingBounds'].some(shallowDiff)) {
      this.onUpdateSupportingBoundsLayer();
      this.forceUpdate();
    }
    if (['anchorLinks', 'anchorLinksVisible', 'qryAnchorSetFocus', 'refAnchorSetFocus'].some(shallowDiff)) {
      this.onUpdateAnchorLinksLayer();
      this.forceUpdate();
    }
    if (['qryAnchorSetFocusContour'].some(shallowDiff)) {
      this.onUpdateQryContourFocusLayer();
      this.forceUpdate();
    }
    if (['refAnchorSetFocusContour'].some(shallowDiff)) {
      this.onUpdateRefContourFocusLayer();
      this.forceUpdate();
    }
    if (shallowDiff('anchorEditTool')) {
      this.forceUpdate();
    }
  }

  // render() is implemented in the abstract parent class.
}

/**
 * Need this wrapper function here,
 * since we want to pass a forwardRef
 * so that outer components can
 * access the grandchild DeckGL ref,
 * but we are using a class component.
 */
const QRComparisonScatterplotWrapper = forwardRef((props, deckRef) => (
  <QRComparisonScatterplot
    {...props}
    deckRef={deckRef}
  />
));
export default QRComparisonScatterplotWrapper;
