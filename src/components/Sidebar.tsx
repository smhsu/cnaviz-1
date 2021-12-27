import React from "react";
import "./Sidebar.css";
import {ClusterTable} from "./ClusterTable";
import {DisplayMode, ProcessingStatus} from "../App";
import {CSV} from "./CSVLink"
import { GenomicBin} from "../model/GenomicBin";
import {FiArrowLeftCircle, FiArrowRightCircle, FiMousePointer, FiZoomIn } from "react-icons/fi";
import { ToggleButton } from "./ToggleButton";
import spinner from "../loading-small.gif";
import {BsQuestionCircle} from "react-icons/bs";

interface Props {
    selectedChr : string;
    onChrSelected : any;
    chrOptions: any;
    onAddSample: any;
    onAssignCluster: any;
    tableData: any;
    onClusterRowsChange: any;
    onClusterColorChange: any;
    currentClusterFilters: String[];
    handleClusterAssignmentInput: any;
    value: string;
    setDisplayMode: any;
    currentDisplayMode: DisplayMode;
    colors: string[];
    onSidebarChange: any;
    data: readonly GenomicBin[];
    logData: any[];
    onFileChosen: any;
    onDriverFileChosen: any;
    chosenFile: string;
    show: boolean;
    onToggleLog: () => void;
    onToggleScatter: () => void;
    onToggleLinear: () => void;
    onToggleShowCentroids: () => void;
    showCentroids: boolean;
    showScatter: boolean;
    showLinear: boolean;
    syncScales: boolean;
    onToggleSync: () => void;
    onToggleSilhouttes: () => void;
    showSilhouttes: ProcessingStatus;
    onToggleDirections: () => void;
}


function Sidebar(props: Props) {
  const showSidebar = () => {
    props.onSidebarChange(!props.show)
  };

  return (

    <div className={props.show ? "sidebar active" : "sidebar"}>
      <div className="closemenu3" onClick={() => {
              props.onToggleDirections();
          }}><BsQuestionCircle></BsQuestionCircle></div>
      <div className="closemenu" onClick={showSidebar}>
          <div> </div>
          {props.show ? (
                <div className="arrow-container"> 
                  <FiArrowLeftCircle/>
                </div>
              ) : (
                <div className="arrow-container">
                  <FiArrowRightCircle/>
                </div>
              )
          }
      </div>

      {props.currentDisplayMode === DisplayMode.select && <div className="closemenu2" onClick={() => {
                if(props.currentDisplayMode === DisplayMode.zoom) { 
                  props.setDisplayMode(DisplayMode.select)
                } else {
                  props.setDisplayMode(DisplayMode.zoom)
                }
              }}><FiMousePointer></FiMousePointer>  </div>}
      {props.currentDisplayMode === DisplayMode.zoom && <div className="closemenu2" onClick={() => {
                if(props.currentDisplayMode === DisplayMode.zoom) { 
                  props.setDisplayMode(DisplayMode.select)
                } else {
                  props.setDisplayMode(DisplayMode.zoom)
                }
              }}><FiZoomIn></FiZoomIn></div>}
      
      
      <div className="contents">
        <h1>CNA-Viz</h1>
        <div className="title-bar"></div>
        <h2>Import/Export</h2>
          <div className="row-contents" > Chosen File: {props.chosenFile}</div>
          <div className="row-contents">
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onFileChosen(event, false)
              } />
              Import
            </label>
          </div>
          
          <div className="row-contents" >
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onFileChosen(event, true)
              }/>
              Import with Clustering
            </label>
          </div>
          
          <div className="row-contents" >
            <label className="custom-file-upload">
              <input type="file" id="fileUpload" onChange={
                (event: any) =>
                props.onDriverFileChosen(event, true)
              }/>
              Import Driver Genes
            </label>
          </div>

          <div className="row-contents">
            <CSV data={props.data} logData={props.logData} fileName={props.chosenFile}></CSV>
          </div>
          
        <div className="title-bar"></div>
        <h2 >Display Settings</h2>
          <div className= "row-contents" >
            <label htmlFor="Select Chromosome"> Select a Chromosome: </label>
            <select
                name="Select Chromosome" 
                id="Select Chromosome"
                value={props.selectedChr}
                onChange={props.onChrSelected} >
                    {props.chrOptions}
            </select>
          </div>
        
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Apply log to RD: </span>
              <input type="checkbox" onClick={props.onToggleLog}/>
            </label>
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Display Scatterplots: </span>
              <input type="checkbox" onClick={props.onToggleScatter} checked={props.showScatter} readOnly/>
            </label>
            
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Display Linear Plots: </span>
              <input type="checkbox" onClick={props.onToggleLinear} checked={props.showLinear} readOnly/>
            </label>
          </div>
          <div className= "row-contents" >
            <label>
              <span className="App-CheckBox-explanation">Show Centroids: </span>
              <input type="checkbox" onClick={props.onToggleShowCentroids} checked={props.showCentroids} readOnly/>
            </label>
          </div>
           <div className= "row-contents" >
           {/* {(props.showSilhouttes === ProcessingStatus.processing || props.showSilhouttes === ProcessingStatus.done)  && <img src={spinner} alt="Loading" />} */}
            {(props.showSilhouttes === ProcessingStatus.none ||props.showSilhouttes === ProcessingStatus.done)   && <label>
              <span className="App-CheckBox-explanation">Show Silhoutte Plot: </span>
              <input type="checkbox" onChange={props.onToggleSilhouttes} checked={props.showSilhouttes === ProcessingStatus.done} readOnly/>
            </label>}
            
          </div>

          <div className= "row-contents" >
            <ToggleButton
                displayMode={props.currentDisplayMode}
                setDisplayMode={() => {
                  if(props.currentDisplayMode === DisplayMode.zoom) { 
                    // setDisplayMode is what the toggle should should change to when clicked (so whatever displayMode that it isn't currently on)
                    props.setDisplayMode(DisplayMode.select) 
                  } else {
                    props.setDisplayMode(DisplayMode.zoom)
                  }
                }}
              />
          </div>

      </div>
        <div className="contents2">
          <ClusterTable 
                data={props.tableData} 
                onClusterRowsChange={props.onClusterRowsChange} 
                onClusterColorChange={props.onClusterColorChange}
                currentFilters={props.currentClusterFilters}
                colOneName={"Cluster ID"}
                colTwoName={"Bins (%)"}
                cols={""}
                expandable={true}
                selectable={true}
                colors={props.colors}
            ></ClusterTable>
          
        </div>
      
    </div>
  );
}

export default Sidebar;