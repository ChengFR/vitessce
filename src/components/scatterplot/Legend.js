/* eslint-disable */
import React, { useMemo } from 'react';
import { scaleSequential } from "d3-scale";
import { interpolateViridis, interpolatePlasma } from "d3-scale-chromatic";
import { interpolate, quantize, interpolateRgb, piecewise } from "d3-interpolate";
import { rgb } from "d3-color";

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
    cellColorEncoding,

    geneSelection,
    geneExpressionColormap,
    geneExpressionColormapRange,

    anchorSetFocus,
    qryCellSets,
    refCellSets,
    qryCellSetColor,
    refCellSetColor,
  } = props;

  const svg = useMemo(() => {
    const interpolateFunc = colormapToFunc[geneExpressionColormap];
    const color = scaleSequential([0, 100], interpolateFunc);
    const n = Math.min(color.domain().length, color.range().length);
    const xlinkHref = ramp(color.copy().domain(quantize(interpolate(0, 1), n))).toDataURL();
    return (
      <svg width="100" height="15">
        <image x="0" y="0" width="100" height="15" preserveAspectRatio="none" xlinkHref={xlinkHref}>

        </image>
      </svg>
    );
  }, [geneExpressionColormap])
 
  return (
    <div className="qrComparisonViewLegend">
      {cellColorEncoding === 'geneSelection' && geneSelection && Array.isArray(geneSelection) && geneSelection.length === 1 ? (
        <>
          <span>Gene Expression</span>
          {svg}
          <span className="continuousLabels">
            <span className="continuousStart">{geneExpressionColormapRange[0]}</span>
            <span className="continuousEnd">{geneExpressionColormapRange[1]}</span>
          </span>
        </>
      ) : null}
    </div>
  );
}
