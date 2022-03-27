/* eslint-disable */
/* eslint-disable no-underscore-dangle */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as _ from 'lodash';
import isEqual from 'lodash/isEqual';
import Tree from './Tree';
import TreeNode from './TreeNode';
import { PlusButton, SetOperationButtons } from './SetsManagerButtons';
import { nodeToRenderProps } from './cell-set-utils';
import { getDefaultColor } from '../utils';
import { pathToKey } from './utils';
import { useVitessceContainer } from '../hooks';

import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ArrowRight from '@material-ui/icons/ArrowRight';
import ArrowDropDown from '@material-ui/icons/ArrowDropDown';
import MoreVert from '@material-ui/icons/MoreVert';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';

const barWidth = 130;

function QRGeneList(props) {
  const {
    header,
    geneList,
    xScale,
    setGeneSelection
  } = props;
  return (
    <>
      <div className='qrTopGeneHeader'>{header}</div>
      {geneList.map(gene =>
        SignificanceIcon({
          geneName: gene.name, score: gene.score, xScale,
          onClick: () => setGeneSelection([gene.name])
        })
      )}
    </>
  )
}

function SignificanceIcon(props) {
  const { score, geneName, xScale, onClick } = props;

  return (<div className="iconContainer" onClick={onClick}>

    <div className={`geneIcon withGeneName`}>
      <div className={`geneIconOuter`} style={{
        height: 30, width: barWidth
      }} />
      <div className={`geneIconQry`} style={{
        width: xScale(score.qry)
      }} />
      <div className={`geneIconRef`} style={{
        width: xScale(score.ref)
      }} />
      <div className="geneName">{geneName}</div>
    </div>
  </div>);
}


/**
 * A query+reference component.
 */
export default function QRScores(props) {
  const {
    anchorId,
    topGenes,
    setGeneSelection
  } = props;


  const geneList = _.flatten(['shared', 'qry', 'ref'].map(group => topGenes[group]));
  const maxScore = _.max(geneList.map(gene => Math.max(gene.score.qry, gene.score.ref)));
  const xScale = (score) => Math.max(score, 0) / maxScore * barWidth / 2;

  return (
    <div className="qrTopGene">
      <div className="qrTopGeneContainer">
        <div className="qrTopGeneColumn shared">
          {QRGeneList({ geneList: topGenes.shared, header: "Shared", xScale, setGeneSelection })}
        </div>
        <div className="qrTopGeneColumn queryTop">
          {QRGeneList({ geneList: topGenes.qry, header: "Query", xScale, setGeneSelection })}
        </div>
        <div className="qrTopGeneColumn refTop">
          {QRGeneList({ geneList: topGenes.ref, header: "Reference", xScale, setGeneSelection })}
        </div>
      </div>
      <div className="qrTopGeneDistContainer">
      </div>
    </div>
  );
}
