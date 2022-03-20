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

const useStyles = makeStyles((theme) => ({
  arrowButtonRoot: {
    padding: '0px',
  },
  menuPaper: {
    transform: 'translate(0, 40px) !important',
  }
}));

function SignificanceIcon(props) {
  const { inRef, inQry, scoreRef, scoreQry, geneName, yScale } = props;

  const scoreRefStr = Number(scoreRef).toFixed(2);
  const scoreQryStr = Number(scoreQry).toFixed(2);

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  const outerRef = useRef();
  const iconRef = useRef();
  const getTooltipContainer = useVitessceContainer(outerRef);

  const [open, setOpen] = useState(false);

  const className = (inRef && inQry) ? 'inBoth' : (inRef ? 'inRef' : 'inQry');

  useEffect(() => {
    if (outerRef && outerRef.current) {
      const containerRect = outerRef.current.getBoundingClientRect();
      setX(containerRect.left);
      setY(containerRect.top);
    }
    if (iconRef && iconRef.current) {
      const handleMouseEnter = () => {
        setOpen(true);
      };
      const handleMouseLeave = () => {
        setOpen(false);
      };
      const container = iconRef.current;
      container.addEventListener('mouseenter', handleMouseEnter);
      container.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
    return () => { };
  }, [iconRef, outerRef, x, y]);

  return (<div className="iconContainer" ref={outerRef} style={{ position: 'relative' }}>

    <div className="geneIcon" ref={iconRef}>
      <div className={`geneIconOuter ${className}`} style={{
        height: yScale ? yScale(scoreQry) : 30,
      }} />
      <div className="geneName">{geneName}</div>
    </div>
    {true ?
      <div className="signifIconTooltip" style={{ display: (open ? 'inline-block' : 'none') }}>
        {geneName}<br />
        Score in Query: {inQry ? (<b>{scoreQryStr}</b>) : (<span>{scoreQryStr}</span>)}<br />
        Score in Reference: {inRef ? (<b>{scoreRefStr}</b>) : (<span>{scoreRefStr}</span>)}
      </div>
      : null}
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
    onHighlightAnchors,
  } = props;

  const classes = useStyles();

  const [anchorEl, setAnchorEl] = useState(null);

  const handleClickName = () => {
    onHighlightAnchors(clusterIndex);
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
      <div className="qrCellSetsTableArrow colArrow">
        <IconButton component="span" classes={{ root: classes.arrowButtonRoot }}>
          <ArrowRight />
        </IconButton>
      </div>
      <div className="qrCellSetsTableHead colName" title={`${clusterIndex} (${anchorType})`}>
        <button onClick={handleClickName} style={{ fontWeight: (anchorType !== 'unjustified' ? 'bold' : 'normal') }}>
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
        <div className="predictionBar"
          title={`Median Anchor Distance (${Number(clusterResults.latentDist).toFixed(2)})`}
          style={{
            width: `${(barWidth - 4) * clusterResults.latentDist}px`, backgroundColor: `rgb(110, 110, 110)`
          }}>
        </div>
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
          {anchorType === 'unjustified' ? (<MenuItem onClick={handleConfirmAnchors}>Confirm</MenuItem>) : null}
          <MenuItem onClick={handleDeleteAnchors}>Delete</MenuItem>
          {anchorType === 'unjustified' ? (<MenuItem onClick={handleEdit}>Edit</MenuItem>) : null}
        </Menu>
      </div>
    </div>
  );
}

function TableRowRight(props) {
  const {
    clusterIndex,
    clusterResults,
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
    qryCellSets,
    refCellSets,

    qryTopGenesLists,

    onHighlightAnchors,
    onDeleteAnchors,
    onConfirmAnchors,
    onEditAnchors,
  } = props;

  const classes = useStyles();


  return (
    <div className="qrCellSets">
      <div className="qrCellSetsTableContainer">
        <div className="qrCellSetsTableLeft">
          <div className="qrCellSetsTableRow">
            <div className="qrCellSetsTableArrow colArrow"></div>
            <div className="qrCellSetsTableHead colName"></div>
            <div className="qrCellSetsTableHead colPrediction">Prediction</div>
            <div className="qrCellSetsTableHead colSimilarity">Similarity</div>
            <div className="qrCellSetsTableHead colEdit"></div>
          </div>
          {qryTopGenesLists ? Object.entries(qryTopGenesLists).map(([anchorType, anchorResults]) => (
            Object.entries(anchorResults).map(([clusterIndex, clusterResults]) => (
              <TableRowLeft
                key={clusterIndex} clusterIndex={clusterIndex} clusterResults={clusterResults}
                anchorType={anchorType}
                onDeleteAnchors={onDeleteAnchors}
                onConfirmAnchors={onConfirmAnchors}
                onEditAnchors={onEditAnchors}
                onHighlightAnchors={onHighlightAnchors}
              />
            ))
          )) : null}
        </div>
        <div className="qrCellSetsTableRight">
          {/* <div className="qrCellSetsTableRightInner"> */}
            <div className="qrCellSetsTableRow">
              <div className="qrCellSetsTableHead colTopGenes">Top genes</div>
            </div>
            {qryTopGenesLists ? Object.entries(qryTopGenesLists).map(([anchorType, anchorResults]) => (
              Object.entries(anchorResults).map(([clusterIndex, clusterResults]) => (
                <TableRowRight
                  key={clusterIndex} clusterIndex={clusterIndex} clusterResults={clusterResults} />
              ))
            )) : null}
          {/* </div> */}
        </div>
      </div>
    </div>
  );
}
