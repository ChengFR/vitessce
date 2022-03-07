/* eslint-disable */
import React, { useEffect } from 'react';
import { pluralize } from '../../utils';
import { useReady, useUrls } from '../hooks';
import { useExpressionAttrs } from '../data-hooks';
import {
  useMultiDatasetCoordination,
  useDatasetUids,
  useCoordination,
  useLoaders,
} from '../../app/state/hooks';
import { COMPONENT_COORDINATION_TYPES } from '../../app/state/coordination';
import { Component } from '../../app/constants';

import TitleInfo from '../TitleInfo';
import QRGeneExpression from './QRGeneExpression';

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
export default function QRGeneExpressionSubscriber(props) {
  const {
    coordinationScopes,
    removeGridComponent,
    variablesLabelOverride: variablesLabel = 'gene',
    variablesPluralLabelOverride: variablesPluralLabel = `${variablesLabel}s`,
    theme,
    title = 'Gene Expression',
  } = props;

  const loaders = useLoaders();

  // Use multi-dataset coordination.
  const datasetUids = useDatasetUids(coordinationScopes);
  const refScope = "QUERY";
  const qryScope = "REFERENCE"
  const refDataset = datasetUids[refScope];
  const qryDataset = datasetUids[qryScope];
  // Get "props" from the coordination space.
  const [cValues, cSetters] = useMultiDatasetCoordination(
    COMPONENT_COORDINATION_TYPES[Component.QR_GENE_EXPRESSION],
    coordinationScopes,
  );
  const [qryValues, qrySetters] = [cValues[qryScope], cSetters[qryScope]];
  const [refValues, refSetters] = [cValues[refScope], cSetters[refScope]];

  /*
  // Get "props" from the coordination space.
  const [{
    dataset,
    geneSelection,
    geneFilter,
    cellColorEncoding,
  }, {
    setGeneSelection,
    setGeneFilter,
    setGeneHighlight,
    setCellColorEncoding,
  }] = useCoordination(COMPONENT_COORDINATION_TYPES.genes, coordinationScopes);
  */

  const [urls, addUrl, resetUrls] = useUrls();
  const [
    isReady,
    setItemIsReady,
    setItemIsNotReady, // eslint-disable-line no-unused-vars
    resetReadyItems,
  ] = useReady(
    GENES_DATA_TYPES,
  );

  // Reset file URLs and loader progress when the dataset has changed.
  useEffect(() => {
    resetUrls();
    resetReadyItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaders, qryDataset, refDataset]);

  
  // Get data from loaders using the data hooks.
  const [qryAttrs] = useExpressionAttrs(
    loaders, qryDataset, setItemIsReady, addUrl, true,
  );
  const [refAttrs] = useExpressionAttrs(
    loaders, refDataset, setItemIsReady, addUrl, true,
  );

  console.log("query", qryAttrs);
  console.log("reference", refAttrs);

  /*
  const geneList = attrs ? attrs.cols : [];
  const numGenes = geneList.length;

  function setGeneSelectionAndColorEncoding(newSelection) {
    setGeneSelection(newSelection);
    setCellColorEncoding('geneSelection');
  }
  */

  return (
    <TitleInfo
      title={title}
      theme={theme}
      // Virtual scroll is used but this allows for the same styling as a scroll component
      // even though this no longer uses the TitleInfo component's
      // scroll css (SelectableTable is virtual scroll).
      isScroll
      removeGridComponent={removeGridComponent}
      isReady={isReady}
      urls={urls}
    >
      <p>TODO(scXAI): gene expression component<br/>(src/components/genes/QRGeneExpressionSubscriber.js)</p>
      {/*<QRGeneExpression
        hasColorEncoding={cellColorEncoding === 'geneSelection'}
        geneList={geneList}
        geneSelection={geneSelection}
        geneFilter={geneFilter}
        setGeneSelection={setGeneSelectionAndColorEncoding}
        setGeneFilter={setGeneFilter}
        setGeneHighlight={setGeneHighlight}
      />*/}
    </TitleInfo>
  );
}
