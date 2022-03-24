/* eslint-disable */
/* eslint-disable no-underscore-dangle */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as _ from 'lodash'
import { useVitessceContainer } from '../hooks';

import { makeStyles } from '@material-ui/core/styles';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import ArrowRight from '@material-ui/icons/ArrowRight';
import ArrowDropDown from '@material-ui/icons/ArrowDropDown';
import MoreVert from '@material-ui/icons/MoreVert';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { Divider, CircularProgress } from '@material-ui/core';
import Sort from '@material-ui/icons/Sort'
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';

const useStyles = makeStyles((theme) => ({
  arrowButtonRoot: {
    padding: '0px',
  },
  menuPaper: {
    transform: 'translate(0, 40px) !important',
  }
}));

function SignificanceIcon(props) {
  const { inRef, inQry, scoreRef, scoreQry, geneName, yScale, showGeneName } = props;

  const scoreRefStr = Number(scoreRef).toFixed(2);
  const scoreQryStr = Number(scoreQry).toFixed(2);

  const className = (inRef && inQry) ? 'inBoth' : (inRef ? 'inRef' : 'inQry');

  return (<div className="iconContainer">

    <div className={`geneIcon ${true ? "withGeneName" : "withoutGeneName"}`}>
      <div className={`geneIconOuter ${className}`} style={{
        height: yScale ? yScale(scoreQry) : 30,
      }} />
      <div className="geneName">{geneName}</div>
    </div>
    <div className="signifIconTooltip">
      {geneName}<br />
      Score in Query: {inQry ? (<b>{scoreQryStr}</b>) : (<span>{scoreQryStr}</span>)}<br />
      Score in Reference: {inRef ? (<b>{scoreRefStr}</b>) : (<span>{scoreRefStr}</span>)}
    </div>
  </div>);
}


const barWidth = 120 - 2;
const barHeight = 24;

function TableRowLeft(props) {
  const {
    anchorType,
    clusterIndex, clusterResults,
    onDeleteAnchors,
    onConfirmAnchors,
    onEditAnchors,
    onFocusAnchors,
    onHighlightAnchors,
  } = props;

  const classes = useStyles();

  const [anchorEl, setAnchorEl] = useState(null);

  const handleMouseOver = () => {
    onHighlightAnchors(clusterIndex);
  };
  const handleMouseOut = () => {
    onHighlightAnchors(null);
  };

  const handleClickName = () => {
    onFocusAnchors(clusterIndex);
  };

  const handleClickMore = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  function handleDeleteAnchors() {
    handleClose();
    console.log("deleting", clusterIndex)
    onDeleteAnchors(clusterIndex);
  }

  function handleConfirmAnchors() {
    handleClose();
    console.log("confirming", clusterIndex)
    onConfirmAnchors(clusterIndex);
  }

  function handleEdit() {
    handleClose();
    onEditAnchors(clusterIndex);
  }

  return (
    <div className="qrCellSetsTableRow" key={clusterIndex}>
      {/* <div className="qrCellSetsTableArrow colArrow">
        <IconButton component="span" classes={{ root: classes.arrowButtonRoot }}>
          <ArrowRight />
        </IconButton>
      </div> */}
      <div className="qrCellSetsTableHead colName" title={`${clusterIndex} (${anchorType})`}>
        <button onClick={handleClickName} onMouseOver={handleMouseOver} onMouseOut={handleMouseOut} style={{ fontWeight: (anchorType !== 'unjustified' ? 'bold' : 'normal') }}>
          {clusterIndex}
        </button>
      </div>
      <div className="qrCellSetsTableHead colPrediction">
        {clusterResults.predictionProportions.map((predictionObj) => (
          <div className="predictionBar" key={predictionObj.name}
            title={`${predictionObj.name} (${Number(predictionObj.proportion).toFixed(2)})`}
            style={{
              width: `${barWidth * predictionObj.proportion}px`,
              backgroundColor: `rgb(${predictionObj.color[0]}, ${predictionObj.color[1]}, ${predictionObj.color[2]})`
            }}>
          </div>
        ))}

      </div>
      <div className="qrCellSetsTableHead colSimilarity">
        <div className="predictionBarOutter"
          style={{
            width: `${(barWidth - 4)}px`,
          }}>
        </div>
        <div className="predictionBarInner"
          title={`Median Anchor Distance (${Number(clusterResults.latentDist).toFixed(2)})`}
          style={{
            width: `${(barWidth - 4) * clusterResults.latentDist}px`, backgroundColor: `rgb(110, 110, 110)`
          }}>
        </div>
      </div>
      <div className="qrCellSetsTableHead colTopGenes">
        <CircularProgress
          value={(40 - clusterResults.names.length) / 20 * 100}
          variant="determinate"
          thickness={5}
          size={28}
          style={{ marginLeft: 20 }}
        >
        </CircularProgress>
      </div>
      <div className="qrCellSetsTableHead colEdit">
        <IconButton component="span" classes={{ root: classes.arrowButtonRoot }} onClick={handleClickMore}>
          <MoreVert />
        </IconButton>
        <Menu
          id={`menu-${clusterResults.id}`}
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          classes={{ paper: classes.menuPaper }}
        >
          {anchorType !== 'confirmed' ? (<MenuItem onClick={handleConfirmAnchors}>Confirm</MenuItem>) : null}
          <MenuItem onClick={handleDeleteAnchors}>Delete</MenuItem>
          {anchorType !== 'confirmed' ? (<MenuItem onClick={handleEdit}>Edit</MenuItem>) : null}
        </Menu>
      </div>
    </div>
  );
}

function TableRowRight(props) {
  const {
    clusterIndex,
    clusterResults,
    showGeneName
  } = props;

  const classes = useStyles();

  const maxScore = _.max(clusterResults.scores.map(score => score.qry))
  const yScale = (score) => Math.max(score, 0) / maxScore * barHeight;

  return (
    <div className="qrCellSetsTableRow" key={clusterIndex}>
      {clusterResults.names.map((geneName, geneIndex) => (
        <div className="qrCellSetsTableHead colGeneResult" key={geneName}>
          <SignificanceIcon
            inRef={clusterResults.significances[geneIndex].ref}
            inQry={clusterResults.significances[geneIndex].qry}
            scoreRef={clusterResults.scores[geneIndex].ref}
            scoreQry={clusterResults.scores[geneIndex].qry}
            showGeneName={showGeneName}
            geneName={geneName}
            yScale={yScale}
          />
        </div>
      ))}
    </div>
  );
}



/**
 * A query+reference cell set manager component.
 */
export default function QRCellSetsManager(props) {
  const {
    qryTopGenesLists,

    showGeneName,

    onFocusAnchors,
    onHighlightAnchors,
    onDeleteAnchors,
    onConfirmAnchors,
    onEditAnchors,
  } = props;

  const classes = useStyles();
  const blockIds = ["user_selection", "unjustified", "confirmed"];

  return (
    <div className="qrCellSets">
      <div className="qrCellSetsTableContainer">
        <div className="qrCellSetsTableLeft">
          <div className="qrCellSetsTableRow">
            {/* <div className="qrCellSetsTableArrow colArrow"></div> */}
            <div className="qrCellSetsTableHead colName"></div>
            <div className="qrCellSetsTableHead colPrediction">
              <span className="qrCellSetsTableHeadText">Prediction</span>
              <Sort></Sort>
            </div>
            <div className="qrCellSetsTableHead colSimilarity">
              <span className="qrCellSetsTableHeadText">Similarity</span>
              <ArrowDownwardIcon></ArrowDownwardIcon>
            </div>
            <div className="qrCellSetsTableHead colTopGenes">
              <span className="qrCellSetsTableHeadText">Top Gene</span>
              <ArrowDownwardIcon></ArrowDownwardIcon>
            </div>
            <div className="qrCellSetsTableHead colEdit"></div>
          </div>
          {/* {qryTopGenesLists ? Object.entries(qryTopGenesLists).map(([anchorType, anchorResults]) => */}
          {qryTopGenesLists ? blockIds.map(blockId => {
            const anchorResults = qryTopGenesLists[blockId];

            return anchorResults && <div className="qrCellSetsTableBlock" key={blockId}>
              {Object.entries(anchorResults).map(([clusterIndex, clusterResults]) => (
                <TableRowLeft
                  key={clusterIndex} clusterIndex={clusterIndex} clusterResults={clusterResults}
                  anchorType={blockId}
                  onDeleteAnchors={onDeleteAnchors}
                  onConfirmAnchors={onConfirmAnchors}
                  onEditAnchors={onEditAnchors}
                  onFocusAnchors={onFocusAnchors}
                  onHighlightAnchors={onHighlightAnchors}
                />
              ))}
            </div>
          }) : null}
        </div>
        {/* <div className="qrCellSetsTableRight">
          <div className="qrCellSetsTableRightInner">
            <div className="qrCellSetsTableRow">
              <div className="qrCellSetsTableHead colTopGenes">Top Gene</div>
            </div>
            {qryTopGenesLists ? Object.entries(qryTopGenesLists).map(([anchorType, anchorResults]) => (
              Object.entries(anchorResults).map(([clusterIndex, clusterResults]) => (
                <TableRowRight
                  key={clusterIndex} clusterIndex={clusterIndex} clusterResults={clusterResults}
                  showGeneName={showGeneName}
                />
              ))
            )) : null}
          </div>
        </div> */}
      </div>
    </div>
  );
}
