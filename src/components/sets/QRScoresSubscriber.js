/* eslint-disable */
import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  useMultiDatasetCoordination,
  useLoaders,
  useSetWarning,
  useDatasetUids,
} from '../../app/state/hooks';
import { COMPONENT_COORDINATION_TYPES } from '../../app/state/coordination';
import QRScores from './QRScores';
import TitleInfo from '../TitleInfo';
import { useUrls, useReady } from '../hooks';
import {
  useAnnDataStatic, useAnnDataDynamic, useAnnDataIndices,
  useDiffGeneNames, useCellSetsTree,
  useAnchors, useInitialCellSetSelection,
  useProcessedAnchorSets,
} from '../data-hooks';
import { Component } from '../../app/constants';
import { mergeCellSets, PALETTE } from '../utils';


/**
 * A subscriber wrapper around the SetsManager component
 * for the 'cell' datatype.
 * @param {object} props
 * @param {string} props.theme The current theme name.
 * @param {object} props.coordinationScopes The mapping from coordination types to coordination
 * scopes.
 * @param {function} props.removeGridComponent The callback function to pass to TitleInfo,
 * to call when the component has been removed from the grid.
 * @param {string} props.title The component title.
 */
export default function QRScoresSubscriber(props) {
  const {
    coordinationScopes,
    removeGridComponent,
    theme,
    title = 'Scores',
  } = props;

  const loaders = useLoaders();
  const setWarning = useSetWarning();

  // Use multi-dataset coordination.
  const datasetUids = useDatasetUids(coordinationScopes);
  const refScope = "REFERENCE";
  const qryScope = "QUERY"
  const refDataset = datasetUids[refScope];
  const qryDataset = datasetUids[qryScope];

  // Get "props" from the coordination space.
  const [cValues, cSetters] = useMultiDatasetCoordination(
    COMPONENT_COORDINATION_TYPES[Component.QR_CELL_SETS],
    coordinationScopes,
  );
  const [qryValues, qrySetters] = [cValues[qryScope], cSetters[qryScope]];
  const [refValues, refSetters] = [cValues[refScope], cSetters[refScope]];
  
  const anchorApiState = qryValues.anchorApiState;
  const anchorIteration = anchorApiState.iteration;
  const anchorStatus = anchorApiState.status;
  const modelIteration = qryValues.modelApiState.iteration;
  const modelStatus = qryValues.modelApiState.status;

  const [urls, addUrl, resetUrls] = useUrls();
  const [
    isReady,
    setItemIsReady,
    setItemIsNotReady, // eslint-disable-line no-unused-vars
    resetReadyItems,
  ] = useReady([anchorStatus, modelStatus]);

  // Reset file URLs and loader progress when the dataset has changed.
  useEffect(() => {
    resetUrls();
    resetReadyItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, qryDataset, refDataset]);

  // Get the cells data loader for the query and reference datasets.
  const qryLoader = loaders[qryDataset].loaders.cells;
  const refLoader = loaders[refDataset].loaders.cells;
  // Get the loader options (from the view config file definition).
  const qryOptions = qryLoader?.options;
  const refOptions = refLoader?.options;

  const [anchors, anchorsStatus] = useAnchors(qryLoader, anchorIteration, setItemIsReady);

  // Load the data.
  // Cell IDs
  const [qryCellsIndex, qryGenesIndex] = useAnnDataIndices(loaders, qryDataset, setItemIsReady, true);
  const [refCellsIndex, refGenesIndex] = useAnnDataIndices(loaders, refDataset, setItemIsReady, true);

  // Cell sets
  const [refCellType] = useAnnDataStatic(loaders, refDataset, refOptions?.features?.cellType?.path, 'columnString', setItemIsReady, false);
  const [qryPrediction, qryPredictionStatus] = useAnnDataDynamic(loaders, qryDataset, qryOptions?.features?.prediction?.path, 'columnString', modelIteration, setItemIsReady, false);
  // const [qryLabel, qryLabelStatus] = useAnnDataDynamic(loaders, qryDataset, qryOptions?.features?.label?.path, 'columnString', modelIteration, setItemIsReady, false);

  const qryCellSets = useCellSetsTree(qryCellsIndex, [qryPrediction], ["Prediction"]);
  const refCellSets = useCellSetsTree(refCellsIndex, [refCellType], ["Cell Type"]);

  // Anchor matrix
  //const [qryAnchorMatrix, qryAnchorMatrixStatus] = useAnnDataDynamic(loaders, qryDataset, qryOptions?.anchorMatrix?.path, 'columnNumeric', modelIteration, setItemIsReady, false);
  //const [refAnchorMatrix, refAnchorMatrixStatus] = useAnnDataDynamic(loaders, refDataset, refOptions?.anchorMatrix?.path, 'columnNumeric', modelIteration, setItemIsReady, false);

  // Anchor cluster
  const [qryAnchorCluster, qryAnchorClusterStatus] = useAnnDataDynamic(loaders, qryDataset, qryOptions?.features?.anchorCluster?.path, 'columnNumeric', modelIteration, setItemIsReady, false);
  const [refAnchorCluster, refAnchorClusterStatus] = useAnnDataDynamic(loaders, refDataset, refOptions?.features?.anchorCluster?.path, 'columnString', modelIteration, setItemIsReady, false);
  const [qryAnchorDist, qryAnchorDistStatus] = useAnnDataDynamic(loaders, qryDataset, qryOptions?.features?.anchorDist?.path, 'columnNumeric', modelIteration, setItemIsReady, false);

  // Differential expression
  const [refDiffGeneNameIndices, refDiffGeneNamesStatus] = useAnnDataDynamic(loaders, refDataset, refOptions?.differentialGenes?.names?.path, 'columnNumeric', modelIteration, setItemIsReady, false);
  const [refDiffGeneScores, refDiffGeneScoresStatus] = useAnnDataDynamic(loaders, refDataset, refOptions?.differentialGenes?.scores?.path, 'columnNumeric', modelIteration, setItemIsReady, false);
  const [refDiffClusters, refDiffClustersStatus] = useAnnDataDynamic(loaders, refDataset, refOptions?.differentialGenes?.clusters?.path, 'columnString', modelIteration, setItemIsReady, false);

  const refDiffGeneNames = useDiffGeneNames(refGenesIndex, refDiffGeneNameIndices);

  const mergedQryCellSets = useMemo(() => mergeCellSets(
    qryCellSets, qryValues.additionalCellSets,
  ), [qryCellSets, qryValues.additionalCellSets]);

  const mergedRefCellSets = useMemo(() => mergeCellSets(
    refCellSets, refValues.additionalCellSets,
  ), [refCellSets, refValues.additionalCellSets]);

  // Initialize cell set colors and selections.
  useInitialCellSetSelection(mergedQryCellSets, qryValues, qrySetters, "Prediction");
  useInitialCellSetSelection(mergedRefCellSets, refValues, refSetters, "Cell Type");

  const qryTopGenesLists = useProcessedAnchorSets(
    anchors, refDiffGeneNames, refDiffGeneScores, refDiffClusters, qryPrediction, qryCellsIndex, qryCellSets, qryValues.cellSetColor, "Prediction"
  );

  const manager = useMemo(() => {
    return (
      <QRScores
        qryTopGenesLists={qryTopGenesLists}
        qryAnchorSetFocus={qryValues.anchorSetFocus}
        refAnchorSetFocus={refValues.anchorSetFocus}
      />
    );
  }, [qryTopGenesLists, qryValues.anchorSetFocus, refValues.anchorSetFocus]); 

  return (
    <TitleInfo
      title={title}
      removeGridComponent={removeGridComponent}
      theme={theme}
      isReady={isReady}
      isScroll
    >
      {manager}
    </TitleInfo>
  );
}
