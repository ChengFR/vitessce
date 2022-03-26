export const Component = {
  DESCRIPTION: 'description',
  STATUS: 'status',
  GENES: 'genes',
  CELL_SETS: 'cellSets',
  SCATTERPLOT: 'scatterplot',
  SPATIAL: 'spatial',
  HEATMAP: 'heatmap',
  LAYER_CONTROLLER: 'layerController',
  CELL_SET_SIZES: 'cellSetSizes',
  GENOMIC_PROFILES: 'genomicProfiles',
  CELL_SET_EXPRESSION: 'cellSetExpression',
  EXPRESSION_HISTOGRAM: 'expressionHistogram',
  QR_COMPARISON_SCATTERPLOT: 'qrComparisonScatterplot',
  QR_SUPPORTING_SCATTERPLOT_QUERY: 'qrSupportingScatterplotQuery',
  QR_SUPPORTING_SCATTERPLOT_REFERENCE: 'qrSupportingScatterplotReference',
  QR_CELL_SETS: 'qrCellSets',
  QR_SCORES: 'qrScores',
};

export const MULTI_DATASET_COMPONENTS = [
  Component.QUERY_REFERENCE_SCATTERPLOT,
];

export const DataType = {
  CELLS: 'cells',
  CELL_SETS: 'cell-sets',
  EXPRESSION_MATRIX: 'expression-matrix',
  GENOMIC_PROFILES: 'genomic-profiles',
  MOLECULES: 'molecules',
  NEIGHBORHOODS: 'neighborhoods',
  RASTER: 'raster',
};

export const FileType = {
  CELLS_JSON: 'cells.json',
  CELL_SETS_JSON: 'cell-sets.json',
  EXPRESSION_MATRIX_ZARR: 'expression-matrix.zarr',
  GENOMIC_PROFILES_ZARR: 'genomic-profiles.zarr',
  MOLECULES_JSON: 'molecules.json',
  NEIGHBORHOODS_JSON: 'neighborhoods.json',
  RASTER_JSON: 'raster.json',
  RASTER_OME_ZARR: 'raster.ome-zarr',
  CLUSTERS_JSON: 'clusters.json',
  GENES_JSON: 'genes.json',
  ANNDATA_CELL_SETS_ZARR: 'anndata-cell-sets.zarr',
  ANNDATA_CELLS_ZARR: 'anndata-cells.zarr',
  ANNDATA_EXPRESSION_MATRIX_ZARR: 'anndata-expression-matrix.zarr',
};

/**
 * Constants representing names of coordination types,
 * to help prevent typos.
 */
export const CoordinationType = {
  DATASET: 'dataset',
  EMBEDDING_TYPE: 'embeddingType',
  EMBEDDING_ZOOM: 'embeddingZoom',
  EMBEDDING_ROTATION: 'embeddingRotation',
  EMBEDDING_TARGET_X: 'embeddingTargetX',
  EMBEDDING_TARGET_Y: 'embeddingTargetY',
  EMBEDDING_TARGET_Z: 'embeddingTargetZ',
  EMBEDDING_CELL_SET_POLYGONS_VISIBLE: 'embeddingCellSetPolygonsVisible',
  EMBEDDING_CELL_SET_LABELS_VISIBLE: 'embeddingCellSetLabelsVisible',
  EMBEDDING_CELL_SET_LABEL_SIZE: 'embeddingCellSetLabelSize',
  EMBEDDING_CELL_RADIUS: 'embeddingCellRadius',
  EMBEDDING_CELL_RADIUS_MODE: 'embeddingCellRadiusMode',
  EMBEDDING_CELL_OPACITY: 'embeddingCellOpacity',
  EMBEDDING_CELL_OPACITY_MODE: 'embeddingCellOpacityMode',
  SPATIAL_ZOOM: 'spatialZoom',
  SPATIAL_ROTATION: 'spatialRotation',
  SPATIAL_TARGET_X: 'spatialTargetX',
  SPATIAL_TARGET_Y: 'spatialTargetY',
  SPATIAL_TARGET_Z: 'spatialTargetZ',
  SPATIAL_ROTATION_X: 'spatialRotationX',
  SPATIAL_ROTATION_Y: 'spatialRotationY',
  SPATIAL_ROTATION_Z: 'spatialRotationZ',
  SPATIAL_ROTATION_ORBIT: 'spatialRotationOrbit',
  SPATIAL_ORBIT_AXIS: 'spatialOrbitAxis',
  SPATIAL_AXIS_FIXED: 'spatialAxisFixed',
  HEATMAP_ZOOM_X: 'heatmapZoomX',
  HEATMAP_ZOOM_Y: 'heatmapZoomY',
  HEATMAP_TARGET_X: 'heatmapTargetX',
  HEATMAP_TARGET_Y: 'heatmapTargetY',
  CELL_FILTER: 'cellFilter',
  CELL_HIGHLIGHT: 'cellHighlight',
  CELL_SET_SELECTION: 'cellSetSelection',
  CELL_SET_HIGHLIGHT: 'cellSetHighlight',
  CELL_SET_COLOR: 'cellSetColor',
  GENE_FILTER: 'geneFilter',
  GENE_HIGHLIGHT: 'geneHighlight',
  GENE_SELECTION: 'geneSelection',
  GENE_EXPRESSION_COLORMAP: 'geneExpressionColormap',
  GENE_EXPRESSION_TRANSFORM: 'geneExpressionTransform',
  GENE_EXPRESSION_COLORMAP_RANGE: 'geneExpressionColormapRange',
  CELL_COLOR_ENCODING: 'cellColorEncoding',
  SPATIAL_RASTER_LAYERS: 'spatialRasterLayers',
  SPATIAL_CELLS_LAYER: 'spatialCellsLayer',
  SPATIAL_MOLECULES_LAYER: 'spatialMoleculesLayer',
  SPATIAL_NEIGHBORHOODS_LAYER: 'spatialNeighborhoodsLayer',
  GENOMIC_ZOOM_X: 'genomicZoomX',
  GENOMIC_ZOOM_Y: 'genomicZoomY',
  GENOMIC_TARGET_X: 'genomicTargetX',
  GENOMIC_TARGET_Y: 'genomicTargetY',
  ADDITIONAL_CELL_SETS: 'additionalCellSets',
  MOLECULE_HIGHLIGHT: 'moleculeHighlight',
  ANCHOR_API_STATE: 'anchorApiState',
  MODEL_API_STATE: 'modelApiState',
  ANCHOR_EDIT_TOOL: 'anchorEditTool', // Is the user lassoing? Either 'lasso' or null.
  ANCHOR_EDIT_MODE: 'anchorEditMode', // Which anchor set is the user currently editing?
  ANCHOR_SET_FOCUS: 'anchorSetFocus', // Which anchor set to focus? (caused by click in Cell Sets)
  ANCHOR_SET_HIGHLIGHT: 'anchorSetHighlight', // Which anchor set to highlight? (caused by hover in Cell Sets)
  EMBEDDING_VISIBLE: 'embeddingVisible', // Whether the embedding is visible (boolean). Intended to be used by the comparison view to determine whether to show the reference or query only.
  EMBEDDING_ENCODING: 'embeddingEncoding', // scatterplot, heatmap, or contour.
  EMBEDDING_LINKS_VISIBLE: 'embeddingLinksVisible', // Whether the lines linking between corresponding query and reference anchor sets are visible (boolean).
  ANCHOR_SET_FILTER: 'anchorSetFilter', // How to sort and filter the list of anchor sets in the Cell Sets view.
  PRESET_BUTTONS_VISIBLE: 'presetButtonsVisible',
  EMBEDDING_LEGENDS_VISIBLE: 'embeddingLegendsVisible',
  DEBUG_CELL_TYPES: 'debugCellTypes',
};
