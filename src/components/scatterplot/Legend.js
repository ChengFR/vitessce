/* eslint-disable */
import React, { useMemo } from 'react';
import { scaleSequential } from "d3-scale";
import { interpolateViridis, interpolatePlasma } from "d3-scale-chromatic";
import { interpolate, quantize, interpolateRgb, piecewise } from "d3-interpolate";
import { rgb } from "d3-color";
import every from 'lodash/every';

const QRY_COLOR = [120, 120, 120];
const REF_COLOR = [201, 201, 201];

// Reference: https://observablehq.com/@mjmdavis/color-encoding
const interpolateJet = () => {
  //The steps in the jet colorscale
  const jet_data_lin = [
    [0,0,0.5],
    [0,0,1],
    [0,0.5,1],
    [0,1,1],
    [0.5,1,0.5],
    [1,1,0],
    [1,0.5,0],
    [1,0,0],
    [0.5,0,0]
  ]
  
  const jet_rgb = jet_data_lin.map(x => {
    return rgb.apply(null, x.map(y=>y*255))
  });
  
  //perform piecewise interpolation between each color in the range
  return piecewise(interpolateRgb, jet_rgb);
};

// Reference: https://observablehq.com/@d3/color-legend
function ramp(color, n = 256) {
    const canvas = document.createElement("canvas");
    canvas.width = n;
    canvas.height = 1;
    const context = canvas.getContext("2d");
    for (let i = 0; i < n; ++i) {
      context.fillStyle = color(i / (n - 1));
      context.fillRect(i, 0, 1, 1);
    }
    return canvas;
}

const colormapToFunc = {
  plasma: interpolatePlasma,
  viridis: interpolateViridis,
  jet: interpolateJet(),
};

export default function Legend(props) {
  const {
    visible,
    cellColorEncoding,

    geneSelection,
    geneExpressionColormap,
    geneExpressionColormapRange,

    anchorSetFocus,
    qryCellSets,
    refCellSets,
    qryCellSetColor,
    refCellSetColor,

    qryEmbeddingEncoding,
    refEmbeddingEncoding,
  } = props;

  const svg = useMemo(() => {
    const interpolateFunc = colormapToFunc[geneExpressionColormap];
    const color = scaleSequential([0, 100], interpolateFunc);
    const n = Math.min(color.domain().length, color.range().length);
    const xlinkHref = ramp(color.copy().domain(quantize(interpolate(0, 1), n))).toDataURL();
    return (
      <svg width="100" height="15">
        <image x="0" y="0" width="100" height="15" preserveAspectRatio="none" xlinkHref={xlinkHref} />
      </svg>
    );
  }, [geneExpressionColormap]);

  const geneExpressionLegend = useMemo(() => {
    if(cellColorEncoding === 'geneSelection' && geneSelection && Array.isArray(geneSelection) && geneSelection.length === 1) {
      return (
        <>
          <span className="continuousTitle">Gene Expression</span>
          {svg}
          <span className="continuousLabels">
            <span className="continuousStart">{geneExpressionColormapRange[0]}</span>
            <span className="continuousEnd">{geneExpressionColormapRange[1]}</span>
          </span>
        </>
      );
    }
    return null;
  }, [svg, cellColorEncoding, geneSelection, geneExpressionColormapRange]);

  const cellSetLegend = useMemo(() => {
    if(cellColorEncoding === 'cellSetSelection' && qryCellSetColor && qryCellSetColor.length > 0 && refCellSetColor && refCellSetColor.length > 0) {
      if(qryCellSetColor.length === refCellSetColor.length && every(qryCellSetColor.map((qs, i) => ([qs.path[1], refCellSetColor[i].path[1]])), val => val[0] === val[1])) {
        return (
          <span className="categoricalLabels">
            <span className="categoricalTitle">Cell Type Prediction</span>
            {qryCellSetColor.map(({ color, path }) => (
              <span className="categoricalItem" key={path[1]}>
                <span style={{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`}} />
                <span>{path[1]}</span>
              </span>
            ))}
          </span>
        );
      }
    }
    return null;
  }, [cellColorEncoding, qryCellSetColor, refCellSetColor]);

  const datasetLegend = useMemo(() => {
    if(qryEmbeddingEncoding === 'scatterplot' && refEmbeddingEncoding === 'scatterplot' && cellColorEncoding === 'dataset') {
      return (
        <span className="categoricalLabels">
          <span className="categoricalTitle">Dataset</span>
          <span className="categoricalItem">
            <span style={{ backgroundColor: `rgb(${QRY_COLOR[0]}, ${QRY_COLOR[1]}, ${QRY_COLOR[2]})`}} />
            <span>Query</span>
          </span>
          <span className="categoricalItem">
            <span style={{ backgroundColor: `rgb(${REF_COLOR[0]}, ${REF_COLOR[1]}, ${REF_COLOR[2]})`}} />
            <span>Reference</span>
          </span>
        </span>
      );
    }
    return null;
  }, [cellColorEncoding, qryEmbeddingEncoding, refEmbeddingEncoding]);

  const contourLegend = useMemo(() => {
    if(refEmbeddingEncoding.includes("contour")) {
      return (
        <span className="categoricalLabels">
          <span className="categoricalTitle">Dataset</span>
          <span className="categoricalItem">
            <span style={{ backgroundColor: `rgb(${QRY_COLOR[0]}, ${QRY_COLOR[1]}, ${QRY_COLOR[2]})`}} />
            <span>Query</span>
          </span>
          <span className="categoricalItem">
            <span style={{
              backgroundImage: 'url(https://raw.githubusercontent.com/visgl/deck.gl/master/examples/layer-browser/data/pattern.png)',
              backgroundPosition: 'bottom left',
              backgroundSize: '20px',
              backgroundRepeat: 'repeat-x',
            }} />
            <span>Reference</span>
          </span>
        </span>
      );
    }
    return null;
  }, [qryEmbeddingEncoding, refEmbeddingEncoding])
 
  return (visible ? (
    <div className="qrComparisonViewLegend">
      {geneExpressionLegend}
      {cellSetLegend}
      {datasetLegend}
      {contourLegend}
    </div>
  ) : null);
}
