import React from "react";

import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { hg38 } from "../model/Genome";
import {DisplayMode, genome} from "../App";
import { LinearPlot } from "./LinearPlot";
import { GenomicBin } from "../model/GenomicBin";
import { MergedGenomicBin } from "../model/BinMerger";

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
}

export function RDLinearPlot(props: Props & {rdRange: [number, number]}) {
    const {data, chr, rdRange, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, 
        brushedBins, customColor, colors, yScale, clusterTableData, applyLog, displayMode, width} = props;

    return <LinearPlot
        data={data}
        dataKeyToPlot={applyLog ? "logRD" : "RD"}
        genome={genome}
        chr={chr}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        onBrushedBinsUpdated={onBrushedBinsUpdated}
        yMin={yScale ? yScale[0] : (applyLog ? -2 : 0)}
        yMax={yScale ? yScale[1] : rdRange[1]}
        yLabel={"RDR"}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors}
        clusterTableData={clusterTableData}
        displayMode={displayMode}
        width={width}/>
}

export function BAFLinearPlot(props: Props) {
    const {data, chr, hoveredLocation, onLocationHovered, onBrushedBinsUpdated, brushedBins, 
            customColor, colors, xScale, clusterTableData, displayMode, width} = props;
    return <LinearPlot
        data={data}
        chr={chr}
        dataKeyToPlot="reverseBAF"
        genome={genome}
        hoveredLocation={hoveredLocation}
        onLocationHovered={onLocationHovered}
        onBrushedBinsUpdated= {onBrushedBinsUpdated}
        yMin={xScale ? xScale[0] : 0}
        yMax={xScale ? xScale[1] : 0.5}
        yLabel={"0.5 - BAF"}
        brushedBins={brushedBins}
        customColor={customColor}
        colors={colors} 
        clusterTableData={clusterTableData}
        displayMode={displayMode}
        width={width}/>;
}
