/* eslint-disable */
import React from 'react';

export default function FocusInfo(props) {
  const {
    qryAnchorSetFocus,
    qryGeneSelection,
    qryLoadedSelection,
    qryExpressionDataStatus,
  } = props;

 
  return (
    <div className="qrComparisonViewFocusInfo">
      {qryAnchorSetFocus ? (
        <span>{qryAnchorSetFocus}</span>
      ) : null}
    </div>
  );
}
