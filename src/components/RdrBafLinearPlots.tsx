import React from "react";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import {DisplayMode, genome} from "../App";
import { LinearPlot } from "./LinearPlot";
import { GenomicBin } from "../model/GenomicBin";
import { Gene } from "../model/Gene";
import { cn_pair, fractional_copy_number } from "../constants";

interface Props {
    data: GenomicBin[];
    chr: string;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered?: (location: ChromosomeInterval | null) => void
    onBrushedBinsUpdated: (brushedBins: GenomicBin[]) => void;
    brushedBins: GenomicBin[];
    customColor: string;
    colors: string[];
    yScale: [number, number] | null;
    xScale: [number, number] | null;
    clusterTableData: any;
    applyLog: boolean;
    displayMode: DisplayMode;
    width: number;
    onLinearPlotZoom: (genomicRange: [number, number] | null, yscale: [number, number] | null, key: boolean, reset?: boolean) => void;
    implicitStart: number | null;
    implicitEnd: number | null;
    onZoom: (newScales: any) => void;
    driverGenes: Gene[] | null;
    handleDriverGenesChange: (sentGene: {gene: Gene | null, destination: string | null}) => void;
    driverGeneUpdate: {gene: Gene | null, destination: string | null};
    purity: number;
    ploidy: number;
    meanRD: number;
    fractionalCNTicks: fractional_copy_number[];
    showPurityPloidy:boolean;
    BAF_lines: cn_pair[];
}

export function RDLinearPlot(props: Props & {rdRange: [number, number]}) {
    const {data, chr, rdRange, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, 
        brushedBins, customColor, colors, yScale, clusterTableData, applyLog, 
        displayMode, width, onLinearPlotZoom, implicitStart, implicitEnd, onZoom, driverGenes, purity, ploidy, meanRD, fractionalCNTicks, showPurityPloidy, BAF_lines} = props;

    return <LinearPlot
                data={data}
                dataKeyToPlot={(applyLog) ? "logRD" : ((showPurityPloidy) ? "fractional_cn" : "RD")}
                applyLog={applyLog}
                genome={genome}
                chr={chr}
                hoveredLocation={hoveredLocation}
                onLocationHovered={onLocationHovered}
                onBrushedBinsUpdated={onBrushedBinsUpdated}
                yMin={yScale ? yScale[0] : (showPurityPloidy ? rdRange[0] : (applyLog ? -2 : 0))}
                yMax={yScale ? yScale[1] : rdRange[1]}
                yLabel={applyLog ? "log RDR" : (showPurityPloidy ? "Copy Number" : "RDR")}
                brushedBins={brushedBins}
                customColor={customColor}
                colors={colors}
                clusterTableData={clusterTableData}
                displayMode={displayMode}
                width={width}
                onZoom={onZoom}
                onLinearPlotZoom={onLinearPlotZoom}
                implicitStart={implicitStart}
                implicitEnd={implicitEnd}
                driverGenes={driverGenes}
                driverGeneUpdate={props.driverGeneUpdate}
                handleDriverGenesChange={props.handleDriverGenesChange}
                purity={purity}
                ploidy={ploidy}
                meanRD={meanRD}
                fractionalCNTicks={fractionalCNTicks}
                showPurityPloidy={showPurityPloidy}
                BAF_lines={BAF_lines}
        />
}

export function BAFLinearPlot(props: Props) {
    const {data, chr, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, brushedBins, 
            customColor, colors, xScale, clusterTableData, displayMode, width, onLinearPlotZoom, 
            implicitStart, implicitEnd, onZoom, driverGenes, applyLog, purity, ploidy, meanRD, showPurityPloidy, fractionalCNTicks, BAF_lines} = props;

    return <LinearPlot
                data={data}
                chr={chr}
                dataKeyToPlot="reverseBAF"
                applyLog={applyLog}
                genome={genome}
                hoveredLocation={hoveredLocation}
                onLocationHovered={onLocationHovered}
                onBrushedBinsUpdated= {onBrushedBinsUpdated}
                yMin={xScale ? xScale[0] : -.01}
                yMax={xScale ? xScale[1] : 0.51}
                yLabel={"0.5 - BAF"}
                brushedBins={brushedBins}
                customColor={customColor}
                colors={colors} 
                clusterTableData={clusterTableData}
                displayMode={displayMode}
                width={width}
                onLinearPlotZoom={onLinearPlotZoom}
                implicitStart={implicitStart}
                implicitEnd={implicitEnd}
                onZoom={onZoom}
                driverGenes={driverGenes}
                driverGeneUpdate={props.driverGeneUpdate}
                handleDriverGenesChange={props.handleDriverGenesChange}
                purity={purity}
                ploidy={ploidy}
                meanRD={meanRD}
                showPurityPloidy={showPurityPloidy}
                fractionalCNTicks={fractionalCNTicks}
                BAF_lines={BAF_lines}
        />;
}


