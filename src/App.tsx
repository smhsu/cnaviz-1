import React from "react";
import parse from "csv-parse";
import _ from "lodash";
import { ChromosomeInterval } from "./model/ChromosomeInterval";
import { GenomicBin } from "./model/GenomicBin";
import { DataWarehouse, reformatBins } from "./model/DataWarehouse";
import {SampleViz} from "./components/SampleViz";
import spinner from "./loading-small.gif";
import "./App.css";
import {LogTable} from "./components/LogTable";
import * as d3 from "d3";
import {Genome} from "./model/Genome";
import Sidebar from "./components/Sidebar";
import "./App.css";
import { ClusterTable } from "./components/ClusterTable";
import { Gene } from "./model/Gene";
import { BarPlot } from "./components/BarPlot";
import {FiX} from "react-icons/fi";
import {calculateSilhoutteScores} from "./util"

function getFileContentsAsString(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function() {
            resolve(reader.result as string);
        }
        reader.onerror = reject;
        reader.onabort = reject;
    });
}

const CLUSTER_COLORS = [
    "#d3fe14", "#c9080a", "#fec7f8", "#0b7b3e", "#3957ff", "#0bf0e9", "#c203c8", "#fd9b39", 
    "#906407", "#98ba7f", "#fe6794", "#10b0ff", "#ac7bff", "#fee7c0", "#964c63", "#1da49c", "#0ad811", 
    "#bbd9fd", "#fe6cfe", "#297192", "#d1a09c", "#78579e", "#81ffad", "#739400", "#ca6949", "#d9bf01", 
    "#646a58", "#d5097e", "#bb73a9", "#ccf6e9", "#9cb4b6", "#b6a7d4", "#9e8c62", "#6e83c8", "#01af64", 
    "#a71afd", "#cfe589", "#d4ccd1", "#fd4109", "#bf8f0e", "#2f786e", "#4ed1a5", "#d8bb7d", "#a54509", 
    "#6a9276", "#a4777a", "#fc12c9", "#606f15", "#3cc4d9", "#f31c4e", "#73616f", "#f097c6", "#fc8772", 
    "#92a6fe", "#875b44", "#699ab3", "#94bc19", "#7d5bf0", "#d24dfe", "#c85b74", "#68ff57", "#b62347", 
    "#994b91", "#646b8c", "#977ab4", "#d694fd", "#c4d5b5", "#fdc4bd", "#1cae05", "#7bd972", "#e9700a", 
    "#d08f5d", "#8bb9e1", "#fde945", "#a29d98", "#1682fb", "#9ad9e0", "#d6cafe", "#8d8328", "#b091a7", 
    "#647579", "#1f8d11", "#e7eafd", "#b9660b", "#a4a644", "#fec24c", "#b1168c", "#188cc1", "#7ab297", 
    "#4468ae", "#c949a6", "#d48295", "#eb6dc2", "#d5b0cb", "#ff9ffb", "#fdb082", "#af4d44", "#a759c4", 
    "#a9e03a", "#0d906b", "#9ee3bd", "#5b8846", "#0d8995", "#f25c58", "#70ae4f", "#847f74", "#9094bb", 
    "#ffe2f1", "#a67149", "#936c8e", "#d04907", "#c3b8a6", "#cef8c4", "#7a9293", "#fda2ab", "#2ef6c5", 
    "#807242", "#cb94cc", "#b6bdd0", "#b5c75d", "#fde189", "#b7ff80", "#fa2d8e", "#839a5f", "#28c2b5", 
    "#e5e9e1", "#bc79d8", "#7ed8fe", "#9f20c3", "#4f7a5b", "#f511fd", "#09c959", "#bcd0ce", "#8685fd", 
    "#98fcff", "#afbff9", "#6d69b4", "#5f99fd", "#aaa87e", "#b59dfb", "#5d809d", "#d9a742", "#ac5c86", 
    "#9468d5", "#a4a2b2", "#b1376e", "#d43f3d", "#05a9d1", "#c38375", "#24b58e", "#6eabaf", "#66bf7f", 
    "#92cbbb", "#ddb1ee", "#1be895", "#c7ecf9", "#a6baa6", "#8045cd", "#5f70f1", "#a9d796", "#ce62cb", 
    "#0e954d", "#a97d2f", "#fcb8d3", "#9bfee3", "#4e8d84", "#fc6d3f", "#7b9fd4", "#8c6165", "#72805e", 
    "#d53762", "#f00a1b", "#de5c97", "#8ea28b", "#fccd95", "#ba9c57", "#b79a82", "#7c5a82", "#7d7ca4", 
    "#958ad6", "#cd8126", "#bdb0b7", "#10e0f8", "#dccc69", "#d6de0f", "#616d3d", "#985a25", "#30c7fd", 
    "#0aeb65", "#e3cdb4", "#bd1bee", "#ad665d", "#d77070", "#8ea5b8", "#5b5ad0", "#76655e", "#598100", 
    "#86757e", "#5ea068", "#a590b8", "#c1a707", "#85c0cd", "#e2cde9", "#dcd79c", "#d8a882", "#b256f9", 
    "#b13323", "#519b3b", "#dd80de", "#f1884b", "#74b2fe", "#a0acd2", "#d199b0", "#f68392", "#8ccaa0", 
    "#64d6cb", "#e0f86a", "#42707a", "#75671b", "#796e87", "#6d8075", "#9b8a8d", "#f04c71", "#61bd29", 
    "#bcc18f", "#fecd0f", "#1e7ac9", "#927261", "#dc27cf", "#979605", "#ec9c88", "#8c48a3", "#676769", 
    "#546e64", "#8f63a2", "#b35b2d", "#7b8ca2", "#b87188", "#4a9bda", "#eb7dab", "#f6a602", "#cab3fe", 
    "#ddb8bb", "#107959", "#885973", "#5e858e", "#b15bad", "#e107a7", "#2f9dad", "#4b9e83", "#b992dc", 
    "#6bb0cb", "#bdb363", "#ccd6e4", "#a3ee94", "#9ef718", "#fbe1d9", "#a428a5", "#93514c", "#487434", 
    "#e8f1b6", "#d00938", "#fb50e1", "#fa85e1", "#7cd40a", "#f1ade1", "#b1485d", "#7f76d6", "#d186b3", 
    "#90c25e", "#b8c813", "#a8c9de", "#7d30fe", "#815f2d", "#737f3b", "#c84486", "#946cfe", "#e55432", 
    "#a88674", "#c17a47", "#b98b91", "#fc4bb3", "#da7f5f", "#df920b", "#b7bbba", "#99e6d9", "#a36170", 
    "#c742d8", "#947f9d", "#a37d93", "#889072", "#9b924c", "#23b4bc", "#e6a25f", "#86df9c", "#a7da6c", 
    "#3fee03", "#eec9d8", "#aafdcb", "#7b9139", "#92979c", "#72788a", "#994cff", "#c85956", "#7baa1a", 
    "#de72fe", "#c7bad8", "#85ebfe", "#6e6089", "#9b4d31", "#297a1d", "#9052c0", "#5c75a5", "#698eba", 
    "#d46222", "#6da095", "#b483bb", "#04d183", "#9bcdfe", "#2ffe8c", "#9d4279", "#c909aa", "#826cae"]

export let genome : Genome;

function parseGenomicBins(data: string, applyLog: boolean, applyClustering: boolean): Promise<GenomicBin[]> {
    return new Promise((resolve, reject) => {
        parse(data, {
            cast: true,
            columns: true,
            delimiter: "\t",
            skip_empty_lines: true,
        }, (error, parsed) => {
            if (error) {
                reject(error);
                return;
            }

            
            let end = 0;
            let lastChr = parsed[0]["#CHR"];
            let chrNameLength: any = [];

            for (const bin of parsed) {
                if(!applyClustering) {
                    bin.CLUSTER = -1;
                }

                bin.logRD = Math.log2(bin.RD);

                if(lastChr !==  bin["#CHR"]) {
                    chrNameLength.push({name: lastChr, length: (end - 0)})
                    lastChr = bin["#CHR"]
                }

                end = Number(bin.END);
                bin.reverseBAF = 0.5 - bin.BAF;
            }

            chrNameLength.push({name: lastChr, length: (end - 0)})

            chrNameLength.sort((a: any, b : any) => {
                return a.name.localeCompare(b.name, undefined, {
                    numeric: true,
                    sensitivity: 'base'
                })
            })

            genome = new Genome(chrNameLength);
            
            for (const bin of parsed) {
                bin.genomicPosition = genome.getImplicitCoordinates(new ChromosomeInterval(bin["#CHR"], bin.START, bin.END)).start;
            }


            resolve(parsed);
        });
    })
}

function parseDriverGenes(data: string): Promise<Gene[]> {
    return new Promise((resolve, reject) => {
        parse(data, {
            cast: true,
            columns: true,
            delimiter: "\t",
            skip_empty_lines: true,
            skip_lines_with_error: true
        }, (error, parsed) => {

            if (error) {
                reject(error);
                return;
            }

            for(const gene of parsed) {
                const components : string[] = gene["Genome Location"].split(":");
                const start_end = components[1].split("-");
                let interval : ChromosomeInterval = new ChromosomeInterval(components[0], Number(start_end[0]), Number(start_end[1]));
                gene.location = interval;
            }

            resolve(parsed);
        });
    })
}

/**
 * Possible states of processing input data.
 */
export enum ProcessingStatus {
    /** No data input (yet) */
    none,

    /** Reading data into memory */
    readingFile,

    /** Reformatting, aggregating, converting, or otherwise analyzing data. */
    processing,

    /** The results of data processing step are available. */
    done,

    /** An error happened during any step. */
    error
}

interface State {
    /** Current status of reading/processing input data */
    processingStatus: ProcessingStatus;

    /** Indexed data */
    indexedData: DataWarehouse;
    
    /** Current genomic location that the user has selected.  Null if no such location. */
    hoveredLocation: ChromosomeInterval | null;

    /** Name of the chromosome selected for detailed viewing.  Empty string if no chromosome is selected. */
    selectedChr: string;

    selectedCluster: string;

    invertAxis: boolean;

    sampleAmount: number;

    color: string;

    colors: string[];

    assignCluster: boolean;

    assigned: boolean;
    
    applyLog: boolean;

    applyClustering: boolean;

    inputError: boolean;
    
    value: string;

    updatedBins: boolean;

    selectedSample: string;

    displayMode: DisplayMode;

    showComponents: boolean[];

    sidebar: boolean;

    chosenFile: string;

    showLinearPlot: boolean;

    showScatterPlot: boolean;

    showDirections: boolean;

    showLog: boolean;

    showCentroidTable: boolean;

    showCentroids: boolean;

    syncScales: boolean;

    scales: {xScale: [number, number] | null, yScale: [number, number] | null};

    driverGenes: Gene[] | null;

    showSilhouttes: ProcessingStatus;

    silhouttes: {
        cluster: number;
        avg: number;
    }[];
}


export enum DisplayMode {
    zoom,
    select,
    boxzoom,
    erase
};

/**
 * Top-level container.
 * 
 * @author Silas Hsu
 */

export class App extends React.Component<{}, State> {
    
    constructor(props: {}) {
        super(props);
        
        this.state = {
            processingStatus: ProcessingStatus.none,
            indexedData: new DataWarehouse([]),
            hoveredLocation: null,
            selectedChr: DataWarehouse.ALL_CHRS_KEY,
            selectedCluster: DataWarehouse.ALL_CLUSTERS_KEY,
            invertAxis: false,
            sampleAmount: 1,
            showComponents: [true],
            color: 'blue',
            colors:  CLUSTER_COLORS,
            assignCluster: false,
            assigned: false,
            applyLog: false,
            applyClustering: false,
            inputError: false,
            value: "0",
            updatedBins: false,
            selectedSample: "",
            displayMode: DisplayMode.zoom,  
            sidebar:  true,
            chosenFile: "",
            showLinearPlot: true,
            showScatterPlot: true,
            showDirections: false,
            showLog: false,
            showCentroidTable: false,
            showCentroids: false,
            syncScales: false,
            scales: {xScale: null, yScale: null},
            driverGenes: null,
            showSilhouttes: ProcessingStatus.none,
            silhouttes: []
        };

        this.handleFileChoosen = this.handleFileChoosen.bind(this);
        this.handleDriverFileChosen = this.handleDriverFileChosen.bind(this);
        this.handleChrSelected = this.handleChrSelected.bind(this);
        this.handleClusterSelected = this.handleClusterSelected.bind(this);
        this.handleLocationHovered = _.throttle(this.handleLocationHovered.bind(this), 50);
        this.handleAxisInvert = this.handleAxisInvert.bind(this);
        this.handleAddSampleClick = this.handleAddSampleClick.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleAssignCluster = this.handleAssignCluster.bind(this);
        this.handleCallBack = this.handleCallBack.bind(this);
        this.handleClusterAssignmentInput = this.handleClusterAssignmentInput.bind(this);
        this.updateBrushedBins = this.updateBrushedBins.bind(this);
        this.onClusterRowsChange = this.onClusterRowsChange.bind(this);
        this.onClusterColorChange = this.onClusterColorChange.bind(this);
        this.onSelectedSample = this.onSelectedSample.bind(this);
        this.handleRemovePlot = this.handleRemovePlot.bind(this);
        this.setDisplayMode = this.setDisplayMode.bind(this);
        this.onSideBarChange = this.onSideBarChange.bind(this);
        this.toggleLog = this.toggleLog.bind(this);
        this.onToggleLinear = this.onToggleLinear.bind(this); 
        this.onToggleScatter = this.onToggleScatter.bind(this); 
        this.onToggleSync = this.onToggleSync.bind(this);
        this.goBackToPreviousCluster = this.goBackToPreviousCluster.bind(this);
        this.handleZoom = this.handleZoom.bind(this);
        this.onToggleShowCentroids = this.onToggleShowCentroids.bind(this);
        this.onToggleSilhoutteBarPlot = this.onToggleSilhoutteBarPlot.bind(this);
        this.onToggleDirections = this.onToggleDirections.bind(this);
        this.onToggleShowCentroidTable = this.onToggleShowCentroidTable.bind(this);
        this.onTogglePreviousActionLog = this.onTogglePreviousActionLog.bind(this);
        this.onClearClustering = this.onClearClustering.bind(this);
        let self = this;
        d3.select("body").on("keypress", function(){
            if (d3.event.key === "z") {
                self.setState({displayMode: DisplayMode.zoom});
            } else if (d3.event.key === "b") {
                self.setState({displayMode: DisplayMode.select});
            } else if(d3.event.key === "a") {
                self.setState({displayMode: DisplayMode.boxzoom});
            } else if(d3.event.key === "e") {
                self.setState({displayMode: DisplayMode.erase});
            } else if(d3.event.keyCode === 32) {
                self.onSideBarChange(!self.state.sidebar);
            } else if(d3.event.key === "l") {
                self.setState({showLog: !self.state.showLog});
            } else if(d3.event.key === "c") {
                self.setState({showCentroidTable: !self.state.showCentroidTable});
            } else if(d3.event.key === "s") {
                self.onToggleSilhoutteBarPlot();
            }
        })

        d3.select("body").on("keydown", function() {
            if (self.state.displayMode === DisplayMode.zoom && d3.event.key === "Shift") {
                self.setState({displayMode: DisplayMode.boxzoom})
            } else if(d3.event.key === "/" || d3.event.key === "?") {
                self.setState({showDirections: true})
            } else if((self.state.displayMode === DisplayMode.zoom ||  self.state.displayMode === DisplayMode.erase) && d3.event.key === "Meta") {
                self.setState({displayMode: DisplayMode.select})
            } else if((self.state.displayMode === DisplayMode.zoom ||  self.state.displayMode === DisplayMode.select) && d3.event.key === "Alt") {
                self.setState({displayMode: DisplayMode.erase})
            } 
        })

        d3.select("body").on("keyup", function(){
            if (self.state.displayMode === DisplayMode.boxzoom && d3.event.key === "Shift") {
                self.setState({displayMode: DisplayMode.zoom})
            } else if(d3.event.key === "/" || d3.event.key === "?") {
                self.setState({showDirections: false})
            } else if(self.state.displayMode === DisplayMode.select && d3.event.key === "Meta") {
                self.setState({displayMode: DisplayMode.zoom})
            } else if(self.state.displayMode === DisplayMode.erase && d3.event.key === "Alt") {
                self.setState({displayMode: DisplayMode.zoom})
            }
        });
        
    }

    async handleFileChoosen(event: React.ChangeEvent<HTMLInputElement>, applyClustering: boolean) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }
        
        this.setState({chosenFile: files[0].name})
        this.setState({processingStatus: ProcessingStatus.readingFile});
        
        let contents = "";
        try {
            contents = await getFileContentsAsString(files[0]);
            console.log(contents);
        } catch (error) {
            console.error(error);
            this.setState({processingStatus: ProcessingStatus.error});
            return;
        }

        this.setState({processingStatus: ProcessingStatus.processing});
        let indexedData = null;
        try {
            const parsed = await parseGenomicBins(contents, this.state.applyLog, applyClustering);
            indexedData = new DataWarehouse(parsed);

        } catch (error) {
            console.error(error);
            this.setState({processingStatus: ProcessingStatus.error});
            return;
        }

        this.setState({
            indexedData: indexedData,
            processingStatus: ProcessingStatus.done
        });
    }

    async handleDriverFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
        const files = event.target.files;
        if (!files || !files[0]) {
            return;
        }

        let contents = "";
        try {
            
            contents = await getFileContentsAsString(files[0]);
        } catch (error) {
            console.error(error);
            return;
        }
        
        let driverGenes = null;
        try {
            const parsed = await parseDriverGenes(contents); //parseGenomicBins(contents, this.state.applyLog, );
            driverGenes = parsed;
            

        } catch (error) {
            console.error(error);
            return;
        }
        this.setState({driverGenes: driverGenes});
    }
    
    handleChrSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedChr: event.target.value});
        this.state.indexedData.setChrFilter(event.target.value);
    }

    handleClusterSelected(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedCluster: event.target.value});
        this.state.indexedData.setClusterFilters([event.target.value]);
    }

    handleLocationHovered(location: ChromosomeInterval | null) {
        if (!location) {
            this.setState({hoveredLocation: null});
            return;
        }

        this.setState({hoveredLocation: location});
    }

    handleClusterAssignmentInput(event: any) {
        this.setState({value: event.target.value})
    }

    handleCallBack(selectedCluster: string | number) {
        this.state.indexedData.updateCluster(Number(selectedCluster));
        this.setState({assignCluster: false});
        this.state.indexedData.setChrFilter(this.state.selectedChr);
    }

    updateBrushedBins(brushedBins: GenomicBin[]) {
        this.state.indexedData.setbrushedBins(brushedBins);
        this.setState({updatedBins: true});
    }

    handleAxisInvert() {
        this.setState({invertAxis: !this.state.invertAxis});
    }

    handleAddSampleClick() {
        const newShowComponents = this.state.showComponents.concat([true]);
        this.setState({showComponents: newShowComponents});
        this.setState({sampleAmount: this.state.sampleAmount + 1});
    }

    handleRemovePlot(plotId: number) {
        let newShowComponents = [...this.state.showComponents];
        newShowComponents.splice(plotId, 1);
        this.setState({showComponents: newShowComponents});
        this.setState({sampleAmount: this.state.sampleAmount - 1});
    }

    handleAssignCluster() {
        this.setState({assignCluster: !this.state.assignCluster});
    }

    handleColorChange(color : any) {
        this.setState({color: color.hex});
    }

    getStatusCaption() {
        switch (this.state.processingStatus) {
            case ProcessingStatus.readingFile:
                return <div>Reading file... <img src={spinner} alt="Loading" /></div>;
            case ProcessingStatus.processing:
                return <div>Processing data... <img src={spinner} alt="Loading" /></div>;
            case ProcessingStatus.error:
                return "ERROR";
            case ProcessingStatus.none:
            case ProcessingStatus.done:
            default:
                return "";
        }
    }

    onToggleDirections() {
        this.setState({showDirections: !this.state.showDirections});
    }

    toggleLog() {
        this.setState({
            applyLog: !this.state.applyLog
        });
        this.state.indexedData.setShouldRecalculateSilhouttes(true);
        
    }

    toggleClustering() {
        this.setState({
            applyClustering: !this.state.applyClustering
        });
    }

    onClusterRowsChange(state: any) {
        this.state.indexedData.setClusterFilters( state.selectedRows.map((d:any)  => String(d.key)));
        this.setState({indexedData: this.state.indexedData});
    }

    onClusterColorChange(colors: string[]) {
        let newColors = [];
        for(const col of colors) {
            newColors.push(col);
        }
        this.setState({colors: newColors});
    }

    onSelectedSample(selectedSample : any) {
        this.setState({selectedSample : selectedSample});
    }

    setDisplayMode(mode: DisplayMode) {
        this.setState({displayMode: mode});
    }

    onSideBarChange(sidebar: boolean) {
        this.setState({sidebar: sidebar});
    }

    onToggleScatter(){
        this.setState({showScatterPlot: !this.state.showScatterPlot});
    }

    onToggleLinear(){
        this.setState({showLinearPlot: !this.state.showLinearPlot});
    }

    onToggleSync() {
        this.setState({syncScales: !this.state.syncScales});
    }

    onToggleShowCentroids() {
        this.setState({showCentroids: !this.state.showCentroids});
    }

    onToggleShowCentroidTable() {
        this.setState({showCentroidTable: !this.state.showCentroidTable});
    }

    goBackToPreviousCluster() {
        this.state.indexedData.undoClusterUpdate();
        this.setState({indexedData: this.state.indexedData});
    }

    handleZoom(newScales: any) {
        this.setState({scales: newScales});
    }

    onTogglePreviousActionLog() {
        this.setState({showLog: !this.state.showLog});
    }

    onClearClustering() {
        this.state.indexedData.clearClustering();
        this.setState({indexedData: this.state.indexedData});
    }

    async onToggleSilhoutteBarPlot() {
        if(this.state.showSilhouttes === ProcessingStatus.none) {
            this.setState({showSilhouttes: ProcessingStatus.processing});
            this.state.indexedData.recalculateSilhouttes(this.state.applyLog).then((data: {cluster: number, avg: number}[] | undefined) => {
                if(data !== undefined) {
                    this.setState({silhouttes: data});
                    this.setState({showSilhouttes: ProcessingStatus.done});
                }
            });
        } else {
            this.setState({showSilhouttes: ProcessingStatus.none});
        }
    }



    render() {
        const {indexedData, selectedChr, selectedCluster, hoveredLocation, invertAxis, color, assignCluster, updatedBins, value, sampleAmount} = this.state;
        const samples = indexedData.getSampleList();
        const brushedBins = indexedData.getBrushedBins();
        const allData = indexedData.getAllRecords();
        let mainUI = null;
        let clusterTableData = indexedData.getClusterTableInfo();
        let chrOptions : JSX.Element[] = [<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>];
        let actions = indexedData.getActions();
        if (this.state.processingStatus === ProcessingStatus.done && !indexedData.isEmpty()) {
            const clusterTableData = indexedData.getClusterTableInfo();
            const scatterplotProps = {
                data: indexedData,
                hoveredLocation: hoveredLocation || undefined,
                onLocationHovered: this.handleLocationHovered,
                invertAxis,
                chr: selectedChr,
                cluster: selectedCluster,
                customColor: color,
                colors: this.state.colors,
                assignCluster,
                onBrushedBinsUpdated: this.updateBrushedBins,
                parentCallBack: this.handleCallBack,
                brushedBins: brushedBins,
                updatedBins: updatedBins,
                onSelectedSample: this.onSelectedSample,
                selectedSample: this.state.selectedSample,
                dispMode: this.state.displayMode,
                onRemovePlot: this.handleRemovePlot,
                onAddSample: this.handleAddSampleClick,
                clusterTableData: clusterTableData,
                applyLog: this.state.applyLog,
                onClusterSelected: this.handleClusterSelected,
                onUndoClick: this.goBackToPreviousCluster,
                showCentroids: this.state.showCentroids,
                driverGenes: this.state.driverGenes
            };

            chrOptions = indexedData.getAllChromosomes().map(chr => <option key={chr} value={chr}>{chr}</option>);
            chrOptions.push(<option key={DataWarehouse.ALL_CHRS_KEY} value={DataWarehouse.ALL_CHRS_KEY}>ALL</option>);

            const clusterOptions = indexedData.getAllClusters().map((clusterName : string) =>
                <option key={clusterName} value={clusterName}>{clusterName}</option>
            );
            clusterOptions.push(<option key={DataWarehouse.ALL_CLUSTERS_KEY} value={DataWarehouse.ALL_CLUSTERS_KEY}>ALL</option>);

            mainUI = (
                <div id="grid-container">
                    
                    <div className="sampleviz-wrapper-row">
                            {_.times(sampleAmount, i => samples.length > i 
                            && this.state.showComponents[i] 
                            && <SampleViz 
                                    key={i}
                                    {...scatterplotProps} 
                                    initialSelectedSample={samples[i]} 
                                    plotId={i}
                                    showLinearPlot={this.state.showLinearPlot}
                                    showScatterPlot={this.state.showScatterPlot}
                                    showSidebar={this.state.sidebar}
                                    sampleAmount={sampleAmount}
                                    syncScales={this.state.syncScales}
                                    handleZoom={this.handleZoom}
                                    scales={this.state.scales}
                                ></SampleViz>)}
                    </div>
                </div>);
        }
        
        const status = this.getStatusCaption();

        return <div className="container-fluid">
            <div>
                <Sidebar 
                    selectedChr={selectedChr} 
                    onChrSelected={this.handleChrSelected} 
                    chrOptions={chrOptions}
                    onAddSample={this.handleAddSampleClick}
                    onAssignCluster={this.handleAssignCluster}
                    tableData={clusterTableData}
                    onClusterRowsChange={this.onClusterRowsChange}
                    onClusterColorChange={this.onClusterColorChange}
                    currentClusterFilters={indexedData.getFilteredClusters()}
                    handleClusterAssignmentInput={this.handleClusterAssignmentInput}
                    value={value}
                    setDisplayMode={this.setDisplayMode}
                    currentDisplayMode={this.state.displayMode} 
                    colors={this.state.colors}
                    onSidebarChange={this.onSideBarChange}
                    data={allData}
                    onFileChosen={this.handleFileChoosen}
                    chosenFile={this.state.chosenFile}
                    show={this.state.sidebar}
                    onToggleLog = {this.toggleLog}
                    onToggleLinear={this.onToggleLinear}
                    onToggleScatter={this.onToggleScatter}
                    showScatter={this.state.showScatterPlot}
                    showLinear={this.state.showLinearPlot}
                    onToggleSync={this.onToggleSync}
                    syncScales={this.state.syncScales}
                    logData = {actions}
                    onToggleShowCentroids= {this.onToggleShowCentroids}
                    showCentroids= {this.state.showCentroids}
                    onDriverFileChosen={this.handleDriverFileChosen}
                    onToggleSilhouttes={this.onToggleSilhoutteBarPlot}
                    showSilhouttes={this.state.showSilhouttes}
                    onToggleDirections = {this.onToggleDirections}
                    onToggleShowCentroidTable={this.onToggleShowCentroidTable}
                    onTogglePreviousActionLog={this.onTogglePreviousActionLog}
                    onClearClustering={this.onClearClustering}
                />
            </div>
            
            <div className={this.state.sidebar ? "marginContent" : ""}>
                {status && <div className="App-status-pane">{status}</div>}
                {mainUI}

                {this.state.showDirections && <div className="black_overlay"></div> }
                {this.state.showDirections && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header">Directions</h2>
                        <div className="Exit-Popup" onClick={this.onToggleDirections}> 
                            <FiX/>
                        </div>
                        <h5> Selection/Erasing </h5>
                        <li> Hold down "Command/Control" in Zoom mode to temporarily enter Select mode </li>
                        <li> Hold down "Alt" in Zoom mode to temporarily enter Erase mode </li>
                        <li> To completely clear your selection, click anywhere in the plot while in Select/Erase mode </li>
                        <li> To stay in Select mode without holding a button, you can click b or switch the toggle button in the sidebar </li>
                        <li> To stay in Erase mode without holding a button, you can click e </li>
                        <h5> Zoom Mode </h5>
                        <li> The default mode is zoom mode</li>
                        <li> In zoom mode, if you hold down shift, it will act as a bounding box zoom (in the scatterplot) </li>
                        <h5> Other Key Modifiers </h5>
                        <li> Click "l" to toggle a log of previous actions </li>
                        <li> Click space to toggle the sidebar </li>
                        <li> Hold down "?" or "/" button to open direction panel </li>
                        <li> Click "c" to toggle a table of the centroids of each cluster for each sample </li>
                        <li> Click "s" to toggle a bar plot displaying approximate average silhoutte scores for each cluster </li>

                    </div> }

                {this.state.showLog && <div className="black_overlay"></div> }
                {this.state.showLog && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header"> Previous Actions </h2>
                        <div className="Exit-Popup" onClick={()=> this.setState({showLog: !this.state.showLog})}> 
                            <FiX/>
                        </div>
                        <LogTable
                            data={actions}
                            onClusterColorChange={this.onClusterColorChange}
                            onClusterRowsChange={this.onClusterRowsChange}
                            colName={"Actions (Starting from most recent)"}
                        ></LogTable>
                    </div> }

                {this.state.showCentroidTable && <div className="black_overlay"></div> }
                {this.state.showCentroidTable && 
                    <div className="Directions">
                        <h2 className="pop-up-window-header"> Centroid Table </h2>
                        <div className="Exit-Popup" onClick={()=> this.setState({showCentroidTable: !this.state.showCentroidTable})}> 
                            <FiX/>
                        </div>
                        <ClusterTable
                            data={indexedData.getCentroidData()}
                            onClusterColorChange={this.onClusterColorChange}
                            onClusterRowsChange={this.onClusterRowsChange}
                            colors={CLUSTER_COLORS}
                            currentFilters={[""]}
                            centroidTable={true}
                            colOneName={"Cluster"}
                            colTwoName={"Sample"}
                            colThreeName={"Centroid"}
                            cols={[{name: "Cluster", type: 'key'}, {name: "Sample", type: 'sample'}, {name: "Centroid", type: 'centroid'}]}
                        ></ClusterTable>

                    </div> }
                
                {this.state.showSilhouttes === ProcessingStatus.done && <div className="black_overlay"></div> }
                {this.state.showSilhouttes === ProcessingStatus.done && 
                    <div className="Directions2">
                        <h2 className="pop-up-window-header"> Approximate Average Sillhoutte Coefficients </h2>
                        <div className="Exit-Popup" onClick={this.onToggleSilhoutteBarPlot}> 
                            <FiX/>
                        </div>
                        <BarPlot
                            width={700}
                            height={360}
                            data={this.state.silhouttes}
                            colors={CLUSTER_COLORS}
                        ></BarPlot>
                    </div> }
            </div>
            
        </div>;
    }
}
