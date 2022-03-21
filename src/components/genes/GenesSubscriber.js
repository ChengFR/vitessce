/* eslint-disable */
import React, { useEffect } from 'react';
import { pluralize } from '../../utils';
import { useReady, useUrls } from '../hooks';
import { useExpressionAttrs } from '../data-hooks';
import { useCoordination, useLoaders, useMultiDatasetCoordination, useDatasetUids } from '../../app/state/hooks';
import { COMPONENT_COORDINATION_TYPES } from '../../app/state/coordination';
import { Component } from '../../app/constants';

import TitleInfo from '../TitleInfo';
import Genes from './Genes';

const GENES_DATA_TYPES = ['expression-matrix'];

/**
 * A subscriber component for a gene listing component.
 * @param {object} props
 * @param {string} props.theme The current theme name.
 * @param {object} props.coordinationScopes The mapping from coordination types to coordination
 * scopes.
 * @param {function} props.removeGridComponent The callback function to pass to TitleInfo,
 * to call when the component has been removed from the grid.
 * @param {string} props.title The component title.
 * @param {string} props.variablesLabelOverride The singular form
 * of the name of the variable.
 * @param {string} props.variablesPluralLabelOverride The plural
 * form of the name of the variable.
 */
export default function GenesSubscriber(props) {
  const {
    coordinationScopes,
    removeGridComponent,
    variablesLabelOverride: variablesLabel = 'gene',
    variablesPluralLabelOverride: variablesPluralLabel = `${variablesLabel}s`,
    theme,
    title = 'Genes',
  } = props;

  const loaders = useLoaders();

  // Use multi-dataset coordination.
  const datasetUids = useDatasetUids(coordinationScopes);
  const refScope = "REFERENCE";
  const qryScope = "QUERY"
  const refDataset = datasetUids[refScope];
  const qryDataset = datasetUids[qryScope];

  // Get "props" from the coordination space.
  const [cValues, cSetters] = useMultiDatasetCoordination(
    COMPONENT_COORDINATION_TYPES[Component.GENES],
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

  const dataset = qryDataset;
  const geneSelection = qryValues.geneSelection;
  const geneFilter = qryValues.geneFilter;
  const cellColorEncoding = qryValues.cellColorEncoding;

  const setGeneSelection = qrySetters.setGeneSelection;
  const setGeneFilter = qrySetters.setGeneFilter;
  const setGeneHighlight = qrySetters.setGeneHighlight;
  const setCellColorEncoding = qrySetters.setCellColorEncoding;

  // Reset file URLs and loader progress when the dataset has changed.
  useEffect(() => {
    resetUrls();
    resetReadyItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, qryDataset, refDataset]);

  // Get data from loaders using the data hooks.
  const [attrs] = useExpressionAttrs(
    loaders, qryDataset, setItemIsReady, addUrl, true,
  );
  const geneList = attrs ? attrs.cols : [];
  const numGenes = geneList.length;

  function setGeneSelectionAndColorEncoding(newSelection) {
    setGeneSelection(newSelection);
    setCellColorEncoding('geneSelection');
  }

  return (
    <TitleInfo
      title={title}
      info={`${numGenes} ${pluralize(variablesLabel, variablesPluralLabel, numGenes)}`}
      theme={theme}
      // Virtual scroll is used but this allows for the same styling as a scroll component
      // even though this no longer uses the TitleInfo component's
      // scroll css (SelectableTable is virtual scroll).
      isScroll
      removeGridComponent={removeGridComponent}
      isReady={isReady}
    >
      <Genes
        hasColorEncoding={cellColorEncoding === 'geneSelection'}
        geneList={geneList}
        geneSelection={geneSelection}
        geneFilter={geneFilter}
        setGeneSelection={setGeneSelectionAndColorEncoding}
        setGeneFilter={setGeneFilter}
        setGeneHighlight={setGeneHighlight}
      />
    </TitleInfo>
  );
}
