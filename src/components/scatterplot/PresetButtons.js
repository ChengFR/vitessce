/* eslint-disable */
import React from 'react';

export default function PresetButtons(props) {
  const {
    visible,
    qrySetters,
    refSetters,
  } = props;

  function setView1() {
    refSetters.setEmbeddingEncoding('heatmap');
    refSetters.setEmbeddingVisible(true);
    qrySetters.setEmbeddingEncoding('scatterplot');
    qrySetters.setEmbeddingVisible(true);
    qrySetters.setEmbeddingLinksVisible(false);
  }

  function setView2() {
    refSetters.setEmbeddingEncoding('scatterplot');
    refSetters.setEmbeddingVisible(true);
    qrySetters.setEmbeddingEncoding('scatterplot');
    qrySetters.setEmbeddingVisible(false);
    qrySetters.setEmbeddingLinksVisible(false);
  }

  function setView3() {
    refSetters.setEmbeddingEncoding('contour');
    refSetters.setEmbeddingVisible(true);
    qrySetters.setEmbeddingEncoding('scatterplot');
    qrySetters.setEmbeddingVisible(true);
    qrySetters.setEmbeddingLinksVisible(true);
  }

 
  return (visible ? (
    <div className="qrComparisonViewPresetButtons">
      <button onClick={setView1} title="Reference: heatmap, Query: scatterplot">Preset 1</button>
      <button onClick={setView2} title="Reference: scatterplot, Query: hidden">Preset 2</button>
      <button onClick={setView3} title="Reference: contour, Query: scatterplot, Links: visible">Preset 3</button>
    </div>
  ) : null);
}
