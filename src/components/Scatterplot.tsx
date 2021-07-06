import React from "react";
import * as d3 from "d3";
import _, { assign } from "lodash";
import memoizeOne from "memoize-one";

import { CopyNumberCurveDrawer } from "./CopyNumberCurveDrawer";
import { MergedBinHelpers, MergedGenomicBin } from "../model/BinMerger";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { CurveState, CurvePickStatus } from "../model/CurveState";
import { CopyNumberCurve } from "../model/CopyNumberCurve";
import { getCopyStateFromRdBaf, copyStateToString } from "../model/CopyNumberState";
import { niceBpCount, getRelativeCoordinates } from "../util";
import {GenomicBinHelpers} from "../model/GenomicBin";
import "./Scatterplot.css";
import { brush } from "d3";
//import { brush, cluster } from "d3";
import {DisplayMode} from "./SampleViz2D"
//import _ from "lodash";

const visutils = require('vis-utils');

const annotations = [{
  note: {
    label: "Longer text to show text wrapping",
    bgPadding: 20,
    title: "Annotations :)"
  },
  //can use x, y directly instead of data
  data: { date: "18-Sep-09", close: 185.02 },
  className: "show-bg",
  dy: 137,
  dx: 162
}]

const PADDING = { // For the SVG
    left: 60,
    right: 20,
    top: 20,
    bottom: 60,
};
const testGenomicBin: any = {
    "#CHR": "chr1", // Despite this key implying that it is a number, it can contain values like "chr3"
    START: 0,
    END: 1000,
    SAMPLE: "Tumor1",
    
    RD: 1.68453,
    "#SNPS": 0,
    COV: 0,
    ALPHA: 0,
    BETA: 0,
    BAF: 0.309973,
    /** Cluster ID */
    CLUSTER: 0
}

const data3 : MergedGenomicBin[] = [{location: new ChromosomeInterval("1", 0, 1000), averageRd: 1.68453, averageBaf: 0.309973, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 1.0241125, averageBaf: 0.353924875, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 0.990544, averageBaf: 0.31243, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 0.75482, averageBaf: 0.293103, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 0.978867666666668, averageBaf: 0.3831903333333, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 0.7759375, averageBaf: 0.3858975, bins: [testGenomicBin]} , 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 0.924388, averageBaf: 0.342105, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 1.1374833333332, averageBaf: 0.382878333333334, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 1.09714, averageBaf: 0.37202966666667, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 1.1807133333333, averageBaf: 0.407038666666666, bins: [testGenomicBin]}, 
                    {location: new ChromosomeInterval("1", 0, 1000), averageRd: 1.09656033333331, averageBaf: 0.4353606666667, bins: [testGenomicBin]}]

const data4 : any = [{location: null, x: 1.68453, y: 0.309973, bins: []}, 
                    {location: null, x: 1.0241125, y: 0.353924875, bins: []}, 
                    {location: null, x: 0.990544, y: 0.31243, bins: []}, 
                    {location: null, x: 0.75482, y: 0.293103, bins: []}, 
                    {location: null, x: 0.978867666666668, y: 0.3831903333333, bins: []}, 
                    {location: null, x: 0.7759375, y: 0.3858975, bins: []} , 
                    {location: null, x: 0.924388, y: 0.342105, bins: []}, 
                    {location: null, x: 1.1374833333332, y: 0.382878333333334, bins: []}, 
                    {location: null, x: 1.09714, y: 0.37202966666667, bins: []}, 
                    {location: null, x: 1.1807133333333, y: 0.407038666666666, bins: []}, 
                    {location: null, x: 1.09656033333331, y: 0.4353606666667, bins: []}]

const UNCLUSTERED_COLOR = "#999999";

const CLUSTER_COLORS = [
    "#1b9e77", 
    "#d95f02", 
    "#7570b3", 
    "#e7298a", 
    "#66a61e", 
    "#e6ab02", 
    "#a6761d", 
    "#666666", 
    "#fe6794", 
    "#10b0ff",
    "#ac7bff", 
    "#964c63", 
    "#cfe589", 
    "#fdb082", 
    "#28c2b5"
];
//const HIGHLIGHT_COLOR = "red";

const SCALES_CLASS_NAME = "scatterplot-scale";
const CIRCLE_GROUP_CLASS_NAME = "circles";
const CIRCLE_R = 1;
const SELECTED_CIRCLE_R_INCREASE = 2;
const TOOLTIP_OFFSET = 10; // Pixels
let nextCircleIdPrefix = 0;

interface Props {
    parentCallBack: any;
    data: MergedGenomicBin[];
    rdRange: [number, number];
    hoveredLocation?: ChromosomeInterval;
    width: number;
    height: number;
    curveState: CurveState;
    invertAxis: boolean;
    onNewCurveState: (state: Partial<CurveState>) => void;
    onRecordsHovered: (record: MergedGenomicBin | null) => void;
    onBrushedBinsUpdated: any;
    customColor: string;
    colors: string[];
    assignCluster: boolean;
    brushedBins: MergedGenomicBin[];
    updatedBins: boolean;
    displayMode: DisplayMode;
    onZoom: (newYScale: [number, number]) => void
}


export class Scatterplot extends React.Component<Props> {
    static defaultProps = {
        width: 400,
        height: 302,
        onNewCurveState: _.noop,
        onRecordHovered: _.noop,
        customColor: CLUSTER_COLORS[0]
    };

    private _svg: SVGSVGElement | null;
    private _circleIdPrefix: number;
    private _clusters : string[];
    private brushedNodes: Set<MergedGenomicBin>;
    private quadTree: any;
    private _canvas: HTMLCanvasElement | null;
    private _currXScale: any;
    private _currYScale: any;
    private _original_transform: any;
    private _current_transform: any;
    private scatter: any;

    constructor(props: Props) {
        super(props);
        this._svg = null;
        this._canvas = null;
        this.scatter = null;
        this._circleIdPrefix = nextCircleIdPrefix;
        nextCircleIdPrefix++;
        this.computeScales = memoizeOne(this.computeScales);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleCurveHovered = this.handleCurveHovered.bind(this);
        this.onTrigger = this.onTrigger.bind(this);
        this.onBrushedBinsUpdated = this.onBrushedBinsUpdated.bind(this);
        this._clusters = this.initializeListOfClusters();
        this.createNewBrush = this.createNewBrush.bind(this);
        this.rdOrBaf = this.rdOrBaf.bind(this);
        this.switchMode = this.switchMode.bind(this);
        this.brushedNodes = new Set();
        this.onZoom = this.onZoom.bind(this);

        const {bafScale, rdrScale} = this.computeScales(this.props.rdRange, props.width, props.height);
        let xScale = bafScale;
        let yScale = rdrScale;
        this._currXScale = xScale;
        this._currYScale = yScale;
        console.time("Quadtree creation")
        let data : any = props.data;
        this.quadTree = d3
            .quadtree()
            .x((d : any) => d.averageBaf)
            .y((d : any)  => d.averageRd)
            .addAll(data)

        this._original_transform = d3.zoomIdentity.translate(0, 0).scale(1);
        this._current_transform = this._original_transform;
    }

    initializeListOfClusters() : string[] {
        let collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});
        let clusters = [...new Set(this.props.data.map(d => String(d.bins[0].CLUSTER)))].sort(collator.compare); 
        if(clusters[0] === "-1") {
            clusters.shift();
        }
        return clusters;
    }

    handleMouseMove(event: React.MouseEvent<SVGSVGElement>) {
        const {rdRange, width, height, curveState, onNewCurveState, invertAxis} = this.props;
        const {x, y} = getRelativeCoordinates(event);
        const {rdrScale, bafScale} = this.computeScales(rdRange, width, height);
        const hoveredRdBaf = {
            rd: this._currYScale.invert(y),
            baf: this._currXScale.invert(x)
        };
    
        if( hoveredRdBaf.baf > this._currXScale.domain()[0] && hoveredRdBaf.baf < this._currXScale.domain()[1] && hoveredRdBaf.rd > this._currYScale.domain()[0] && hoveredRdBaf.rd < this._currYScale.domain()[1] ) {
            const radius = Math.abs(this._currXScale.invert(x) - this._currXScale.invert(x - 20));
            this.props.onRecordsHovered(this.quadTree.find(hoveredRdBaf.baf, hoveredRdBaf.rd, radius) || null);
        }
    }

    handleCurveHovered(p: number) {
        this.props.onNewCurveState({hoveredP: p});
    }

    renderTooltipAtRdBaf(rd: number, baf: number, contents: JSX.Element | null) {
        if (!contents) {
            return null;
        }

        const {rdRange, width, height, invertAxis} = this.props;
        const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);
        const top =  ((this._currYScale(rd) || 0));
        const left = ((this._currXScale(baf) || 0) + TOOLTIP_OFFSET);

        const tooltipHeight = 150;
        const tooltipWidth = 275
        return <div
            className="Scatterplot-tooltip"
            style={{
                position: "absolute",
                top: top - tooltipHeight, // Alternatively, this could be 0.5 - baf
                left:  left,
                width: tooltipWidth,
                height: tooltipHeight
            }}
        >
            {contents}
        </div>;
    }

    renderTooltip() {
        const {data, hoveredLocation, curveState} = this.props;

        if (!hoveredLocation) {
            return null;
        }
        let hoveredRecords : MergedGenomicBin[] = [];
        hoveredRecords = data.filter(record => record.location.chr === hoveredLocation.chr 
                                                && hoveredLocation.start === record.location.start 
                                                && hoveredLocation.end === record.location.end) //record.location.hasOverlap(hoveredLocation));
        if(hoveredRecords.length === 0) {
            hoveredRecords = data.filter(record => record.location.hasOverlap(hoveredLocation))
        }

        if (hoveredRecords.length === 1) {
            const record = hoveredRecords[0];
            return this.renderTooltipAtRdBaf(record.averageRd, record.averageBaf, <React.Fragment>
                <p>
                    <b>{record.location.toString()}</b><br/>
                    ({niceBpCount(record.location.getLength())})
                </p>
                {/* <div>Number of Bins: {record.bins.length}</div> */}
                <div> RDR: {record.averageRd.toFixed(2)}</div>
                <div> BAF: {record.averageBaf.toFixed(2)}</div>
                <div>Cluster ID:{record.bins[0].CLUSTER}</div>
            </React.Fragment>);
        } else if (hoveredRecords.length > 1) {
            const minBaf = _.minBy(hoveredRecords, "averageBaf")!.averageBaf;
            const maxBaf = _.maxBy(hoveredRecords, "averageBaf")!.averageBaf;
            const meanBaf = _.meanBy(hoveredRecords, "averageBaf");
            const minRd = _.minBy(hoveredRecords, "averageRd")!.averageRd;
            const maxRd = _.maxBy(hoveredRecords, "averageRd")!.averageRd;
            const meanRd = _.meanBy(hoveredRecords, "averageRd");
            return this.renderTooltipAtRdBaf(maxRd, maxBaf, <React.Fragment>
                <p><b>{hoveredRecords.length} corresponding regions</b></p>
                <div>Average RDR: {meanRd.toFixed(2)}</div>
                <div>Average BAF: {meanBaf.toFixed(2)}</div>
                <div>RDR range: [{minRd.toFixed(2)}, {maxRd.toFixed(2)}]</div>
                <div>BAF range: [{minBaf.toFixed(2)}, {maxBaf.toFixed(2)}]</div>
            </React.Fragment>);
        }

        return null;
    }

    switchMode(event: any) {
        console.log("TESTLAHJSDLKJASLDKJASLKJDLKASJDLKASJLKDJASKLJDKLASJLKDJALKSJD");
    }

    render() {
        
        const {width, height, rdRange} = this.props;
        let scatterUI = <div ref={node => this.scatter= node} className="Scatterplot" style={{position: "relative"}}>
                            <canvas
                                ref={node => this._canvas = node}
                                width={width}
                                height={height}
                                style={{position: "absolute", zIndex: -1}} />
                            <svg
                                ref={node => this._svg = node}
                                width={width} height={height}
                                onMouseMove={this.handleMouseMove}
                                onDoubleClick={this.switchMode}
                            ></svg>
                            <div className="Scatterplot-tools">
                                <button id="reset">Reset</button>
                            </div>
                            {this.renderTooltip()}
                        </div>;
        return scatterUI;
    }

    createNewBrush() {
        const svg = d3.select(this._svg);
        const brush = d3.brush()
        .keyModifiers(false)
        .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                .on("start brush", () => this.updatePoints(d3.event))
                .on("end", () => {
                    svg.selectAll("." + "brush").remove();
                    this.onBrushedBinsUpdated([...this.brushedNodes]);
                });
                
        // attach the brush to the chart
        svg.append('g')
            .attr('class', 'brush')
            .call(brush);
    }

    componentDidMount() { 
        this.redraw();
        this.forceHover(this.props.hoveredLocation);
    }

    propsDidChange(prevProps: Props, keys: (keyof Props)[]) {
        return keys.some(key => this.props[key] !== prevProps[key]);
    }

    componentDidUpdate(prevProps: Props) {
        if(this.props["assignCluster"]) {
            this.onTrigger([...this.brushedNodes]);
            this.brushedNodes = new Set();
            this._clusters = this.initializeListOfClusters();
            this.redraw();
        } else if (this.propsDidChange(prevProps, ["displayMode", "colors", "brushedBins", "width", "height", "invertAxis"])) {
            console.log("Rerendering brushedBins", this.props["brushedBins"]);
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        } else if (this.props.hoveredLocation !== prevProps.hoveredLocation) {
            this.forceUnhover(prevProps.hoveredLocation);
            this.forceHover(this.props.hoveredLocation); 
        }
         else if(!(_.isEqual(this.props["data"], prevProps["data"]))) {
            let data : any = this.props.data;
            this.quadTree = d3
                .quadtree()
                .x((d : any) => d.averageBaf)
                .y((d : any)  => d.averageRd)
                .addAll(data)
            this.redraw();
            this.forceHover(this.props.hoveredLocation);
        }
    }

    computeScales(rdRange: [number, number], width: number, height: number, bafRange?: [number, number]) {
        let bafScaleRange = [PADDING.left, width - PADDING.right];
        let rdrScaleRange = [height - PADDING.bottom, PADDING.top];
        let baf = bafRange ? bafRange : [0, 0.5]
        return {
            bafScale: d3.scaleLinear()
                .domain(baf)
                .range(bafScaleRange),
            rdrScale: d3.scaleLinear()
                .domain(rdRange)
                .range(rdrScaleRange)
        };
    }

    onTrigger = (brushedNodes : MergedGenomicBin[]) => {
        this.props.parentCallBack(brushedNodes);
    }

    onBrushedBinsUpdated = (brushedNodes: MergedGenomicBin[]) => {
        this.props.onBrushedBinsUpdated(brushedNodes);
    }

    onZoom(newYScale: [number, number]) {
        this.props.onZoom(newYScale);
    }

    redraw() {
        
        console.time("Rendering");
        if (!this._svg || !this._canvas || !this.scatter) {
            return;
        }

        const {width, height, onRecordsHovered, customColor, 
                assignCluster, invertAxis, brushedBins, data, rdRange} = this.props;
        let {displayMode} = this.props;
        const colorScale = d3.scaleOrdinal(CLUSTER_COLORS).domain(this._clusters);
        const {bafScale, rdrScale} = this.computeScales(rdRange, width, height);

        let xScale = this._currXScale//bafScale;
        let yScale = this._currYScale;
        let xLabel = "0.5 - BAF";
        let yLabel = "RDR";
        if (invertAxis) {
            [xScale, yScale, xLabel, yLabel] = [rdrScale, bafScale, "RDR", "0.5 - BAF"];
        }
        
        const svg = d3.select(this._svg);
        const canvas = d3.select(this._canvas);

        const toolsList = d3.select('.Scatterplot-tools')
            .style('visibility', 'visible');
        toolsList.select('#reset').on('click', () => {
            const t = d3.zoomIdentity.translate(0, 0).scale(1);
            canvas.transition()
            .duration(200)
            .ease(d3.easeLinear)
            .call(zoom.transform, t)

            const {bafScale, rdrScale} = self.computeScales(rdRange, width, height);
            self._currXScale = bafScale;
            self._currYScale = rdrScale;
            xAxis.call(d3.axisBottom(self._currXScale))
            yAxis.call(d3.axisLeft(self._currYScale))

            self.redraw();

            self.props.onZoom(self._currYScale.domain());
        });

        // Remove any previous scales
        svg.selectAll("." + SCALES_CLASS_NAME).remove();

        // X axis stuff
        let xAxis = svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(0, ${height - PADDING.bottom})`)
            .call(d3.axisBottom(this._currXScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("text-anchor", "middle")
            .attr("x", _.mean(this._currXScale.range()))
            .attr("y", height - PADDING.bottom + 40)
            .style("text-anchor", "middle")
            .text(xLabel);

        // Y axis stuff
       let yAxis = svg.append("g")
            .classed(SCALES_CLASS_NAME, true)
            .attr("transform", `translate(${PADDING.left}, 0)`)
            .call(d3.axisLeft(this._currYScale));
        svg.append("text")
            .classed(SCALES_CLASS_NAME, true)
            .attr("y", PADDING.left-40)
            .attr("x", 0-_.mean(this._currYScale.range()))
            .attr("transform", `rotate(-90)`)
            .style("text-anchor", "middle")
            .text(yLabel);
            

        let previous : any = [];
        brushedBins.forEach(d => previous.push(String(d.location)))
        let previous_brushed_nodes = new Set(previous);
        
        

        const ctx = this._canvas.getContext("2d")!;
        var zoom : any = d3.zoom()
            .scaleExtent([0, 100])  // This control how much you can unzoom (x0.5) and zoom (x20)
            .extent([[0, 0], [width, height]])
            .on("zoom", () => {
                const transform = d3.event.transform;
                this._current_transform = transform;
                ctx.save();
                updateChart(this._current_transform);
                ctx.restore();
            });
        
        this._canvas.width = width;
        this._canvas.height = height;

        //applyRetinaFix(this._canvas);
       
        ctx.clearRect(0, 0, width, height); // Clearing an area larger than the canvas dimensions, but that's fine.
        console.log("REDRAW NEW BAF SCALE: ", this._currXScale.domain());
        console.log("REDRAW NEW RDR SCALE: ", this._currYScale.domain());
        for (const d of data) {
            const x = this._currXScale(d.averageBaf);
            const y = this._currYScale(d.averageRd);
            
            let range = this._currXScale.range();
            let range2 = this._currYScale.range();

            if(x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                if ( previous_brushed_nodes.has(String(d.location))) {
                    ctx.fillStyle = customColor;
                } else {
                    ctx.fillStyle = (d.bins[0].CLUSTER == -1) ? UNCLUSTERED_COLOR : (this.props.colors[d.bins[0].CLUSTER] ? this.props.colors[d.bins[0].CLUSTER] : colorScale(String(d.bins[0].CLUSTER)));
                }
                ctx.fillRect(x || 0, (y || 0) - 1, 2, 3);
            }
        }

        // var event_rect = svg.append("rect")
        //     //.attr("rectangle")
        //     .attr("width", width)
        //     .attr("height", height)
        //     .style("fill", "none")
        //     .style("pointer-events", "all")
        //     //.attr('transform', 'translate(' + PADDING.left + ',' + PADDING.top + ')')
        //     .attr("clip-path", "url(#clip)")
        //     .call(zoom);
        var event_rect = svg
            .append("g")
            .classed("eventrect", true)
            .call(zoom)
                .append("rect")
                    .attr("width", width)
                    .attr("height", height)
                    .style("fill", "none")
                    .style("pointer-events", "all")
                    //.attr('transform', 'translate(' + PADDING.left + ',' + PADDING.top + ')')
                    .attr("clip-path", "url(#clip)");


        if(displayMode === DisplayMode.select) {
            //this.createNewBrush();
            const svg = d3.select(this._svg);
            const brush = d3.brush()
            .keyModifiers(false)
            .extent([[PADDING.left - 2*CIRCLE_R, PADDING.top - 2*CIRCLE_R], 
                    [this.props.width - PADDING.right + 2*CIRCLE_R , this.props.height - PADDING.bottom + 2*CIRCLE_R]])
                    .on("start brush", () => this.updatePoints(d3.event))
                    .on("end", () => {
                        svg.selectAll("." + "brush").remove();
                        if(d3.event.sourceEvent.shiftKey) {
                            this.onBrushedBinsUpdated([...this.brushedNodes]);
                        } else {
                            brush_endEvent();
                        }
                    });
                    
            // attach the brush to the chart
            svg.append('g')
                .attr('class', 'brush')
                .call(brush);
        }
        
        function brush_endEvent() {
            if(!self._svg) {return;}
            const {data} = self.props;
            if (data) {
                try {
                    const { selection } = d3.event;
                    let rect = [[self._currXScale.invert(selection[0][0]), self._currYScale.invert(selection[1][1])], // bottom left (x y)
                                [self._currXScale.invert(selection[1][0]), self._currYScale.invert(selection[0][1])]]; // top right (x y)
                    console.log("RECT: ", rect);
                    let newRdRange : [number, number] = [Number(self._currYScale.invert(selection[1][1])), 
                                                        Number(self._currYScale.invert(selection[0][1]))];
                    let newBafRange : [number, number] = [Number(self._currXScale.invert(selection[0][0])), 
                                                            Number(self._currXScale.invert(selection[1][0]))];
                    const {bafScale, rdrScale} = self.computeScales(newRdRange, width, height, newBafRange);
                    self._currXScale = bafScale;
                    self._currYScale = rdrScale;
                    xAxis.call(d3.axisBottom(self._currXScale))
                    yAxis.call(d3.axisLeft(self._currYScale))
                    
                    self.redraw();

                    ctx.clearRect(0, 0, width, height);
                    for (const d of data) {
                        const x = self._currXScale(d.averageBaf);
                        const y = self._currYScale(d.averageRd);
                        
                        let range = self._currXScale.range();
                        let range2 = self._currYScale.range();

                        if(x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                            if ( previous_brushed_nodes.has(String(d.location))) {
                                ctx.fillStyle = customColor;
                            } else {
                                ctx.fillStyle = (d.bins[0].CLUSTER == -1) ? UNCLUSTERED_COLOR : (self.props.colors[d.bins[0].CLUSTER] ? self.props.colors[d.bins[0].CLUSTER] : colorScale(String(d.bins[0].CLUSTER)));
                            }
                            ctx.fillRect(x, y - 1, 2, 3);
                        }
                    }
                    
                    self.props.onZoom(self._currYScale.domain());
                } catch (error) { console.log(error);}
            }
        }
        
        
        // A function that updates the chart when the user zoom and thus new boundaries are available
        let self = this;
        function updateChart(transform : any) {
            var newX = transform.rescaleX(xScale);
            var newY = transform.rescaleY(yScale);
            self._currXScale = newX;
            self._currYScale = newY;

            // update axes with these new boundaries
            xAxis.call(d3.axisBottom(newX))
            yAxis.call(d3.axisLeft(newY))
        
            // update circle position
            ctx.clearRect(0, 0, width, height);
            for (const d of data) {
                const x = newX(d.averageBaf);
                const y = newY(d.averageRd);
                let range = newX.range();
                let range2 = newY.range();

                if(x > range[0] && x < range[1] && y < range2[0] && y > range2[1]) {
                    if(previous_brushed_nodes.has(String(d.location))) {
                          ctx.fillStyle = customColor;
                    } else {
                        ctx.fillStyle = (d.bins[0].CLUSTER == -1) ? UNCLUSTERED_COLOR : (self.props.colors[d.bins[0].CLUSTER] ? self.props.colors[d.bins[0].CLUSTER] : colorScale(String(d.bins[0].CLUSTER)));
                    }
                    //ctx.fillStyle = 'rgba(225, 225, 225, 0.5)';
                    //ctx.globalAlpha = 0.2;
                    ctx.fillRect(x || 0, (y || 0) - 1, 2, 3);
                    //ctx.globalAlpha = 1.0;
                }
            }
        }
        

        if(assignCluster) {
            this.onTrigger([...this.brushedNodes]);
            this.brushedNodes = new Set();
            this._clusters = this.initializeListOfClusters();
        }
        
        console.timeEnd("Rendering");
     }

     updatePoints(event : any) {
        if(!this._svg) {return;}
        const {brushedBins, data} = this.props;
        if (data) {
            try {
                const { selection } = d3.event;
                let rect = [[this._currXScale.invert(selection[0][0]), 
                            this._currYScale.invert(selection[1][1])], 
                            [this._currXScale.invert(selection[1][0]), 
                            this._currYScale.invert(selection[0][1])]];
                let brushNodes : MergedGenomicBin[] = visutils.filterInRectFromQuadtree(this.quadTree, rect,//selection, 
                    (d : MergedGenomicBin) => d.averageBaf, 
                    (d : MergedGenomicBin)  => d.averageRd);
             
                if (brushNodes) {
                    
                    if(event.sourceEvent.shiftKey) {
                        let intersection : MergedGenomicBin[] = _.intersection(brushNodes, brushedBins);
                        brushNodes = _.difference(_.uniq(_.union(brushNodes, brushedBins)), intersection); //_.uniq(_.union(brushNodes, brushedBins)).filter(d => !intersection.some(e => d === e));   
                    }

                    this.brushedNodes = new Set(brushNodes);                  
                } 
            } catch (error) { console.log(error);}
        }
    }

    /**
     * Based on which values are on the x/y axes and which axis the caller is requesting, 
     * gives the relevant data (rdr or baf)
     * @param m Data that the average read depth ratio and average baf are taken from
     * @param invert Indicates which value is on the x-axis and which is on the y (True: baf is on the x-axis)
     * @param xAxis True if it should return the x-axis value
     * @returns Either the averageRd or averageBaf
     * @author Zubair Lalani
     */
    rdOrBaf(m : MergedGenomicBin, invert : boolean, xAxis : boolean) {
        if (xAxis) {
            return (invert) ? m.averageRd : (m.averageBaf);
        } else {  
            return (invert) ?  (m.averageBaf) :  m.averageRd;
        }
    }

    getElementsForGenomeLocation(hoveredLocation?: ChromosomeInterval): Element[] {
        if (!this._svg || !hoveredLocation || !this._canvas) {
            return [];
        }

        let hoveredRecords = this.props.data.filter(record => record.location.chr === hoveredLocation.chr 
                                                && hoveredLocation.start === record.location.start 
                                                && hoveredLocation.end === record.location.end)//record.location.hasOverlap(hoveredLocation));
        if(hoveredRecords.length === 0) {
            hoveredRecords = this.props.data.filter(record => record.location.hasOverlap(hoveredLocation))
        }

        const results: Element[] = [];
        let svg = d3.select(this._svg);
        svg.select("." + CIRCLE_GROUP_CLASS_NAME).remove();
        const colorScale = d3.scaleOrdinal(CLUSTER_COLORS).domain(this._clusters);
        svg.select(".eventrect")
            .append("g")
            .classed(CIRCLE_GROUP_CLASS_NAME, true)
            .selectAll("circle")
                .data(hoveredRecords)
                .enter()
                .append("circle")
                    .attr("id", d => this._circleIdPrefix + d.location.toString())
                    .attr("cx", d => this._currXScale(this.rdOrBaf(d, this.props.invertAxis, true)) || 0)
                    .attr("cy", d => this._currYScale(this.rdOrBaf(d, this.props.invertAxis, false)) || 0) // Alternatively, this could be 0.5 - baf
                    .attr("r", 3)
                    .attr("fill", d => (d.bins[0].CLUSTER == -1) ? UNCLUSTERED_COLOR : (this.props.colors[d.bins[0].CLUSTER] ? this.props.colors[d.bins[0].CLUSTER] : colorScale(String(d.bins[0].CLUSTER))))
                    .attr("fill-opacity", 1)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");
        

        for (const record of hoveredRecords) {
            const id = this._circleIdPrefix + record.location.toString();
            const element = this._svg.getElementById(id);
            if (element) {
                results.push(element);
            }
        }

        return results;
    }

    forceHover(genomeLocation?: ChromosomeInterval) {
        this.getElementsForGenomeLocation(genomeLocation);
    }

    forceUnhover(genomeLocation?: ChromosomeInterval) {
        const elements = this.getElementsForGenomeLocation(genomeLocation);
        if (elements.length === 0) {
            return;
        }

        // for (const element of elements) {
        //     const r = Number(element.getAttribute("r"));
        //     if(r) {
        //         const parent = element.parentElement!;
        //         element.remove();
        //         element.setAttribute("r", String(r - SELECTED_CIRCLE_R_INCREASE));
        //         element.removeAttribute("stroke");
        //         parent.insertBefore(element, parent.firstChild); // Move the element to the very back
        //     }
        // }
        if(this._svg)
            d3.select(this._svg).select("." + CIRCLE_GROUP_CLASS_NAME).remove();
    }
}