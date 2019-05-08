import React from "react";
import _ from "lodash";
import { IndexedGenomicBins, MergedGenomicBin } from "../model/GenomicBin";
import { ChromosomeInterval } from "../model/ChromosomeInterval";
import { Scatterplot } from "./Scatterplot";
import { RDLinearPlot, BAFLinearPlot } from "./RdrBafLinearPlots";
import { DivWithBullseye } from "./DivWithBullseye";

import "./SampleViz.css";

interface Props {
    indexedData: IndexedGenomicBins;
    initialSelectedSample?: string;
    width?: number;
    height?: number;
    hoveredLocation?: ChromosomeInterval;
    onLocationHovered: (location: ChromosomeInterval | null) => void;
}
interface State {
    selectedSample: string;
}

export class SampleViz extends React.Component<Props, State> {
    static defaultProps = {
        onLocationHovered: _.noop
    };

    constructor(props: Props) {
        super(props);
        this.state = {
            selectedSample: props.initialSelectedSample || Object.keys(props.indexedData)[0]
        }
        this.handleSelectedSampleChanged = this.handleSelectedSampleChanged.bind(this);
        this.handleRecordsHovered = this.handleRecordsHovered.bind(this);
    }

    handleSelectedSampleChanged(event: React.ChangeEvent<HTMLSelectElement>) {
        this.setState({selectedSample: event.target.value});
    }

    handleRecordsHovered(record: MergedGenomicBin | null) {
        const location = record ? record.location : null;
        this.props.onLocationHovered(location);
    }

    render() {
        const {indexedData, width, height, hoveredLocation, onLocationHovered} = this.props;
        const selectedSample = this.state.selectedSample;
        const sampleOptions = Object.keys(indexedData).map(sampleName =>
            <option key={sampleName} value={sampleName}>{sampleName}</option>
        );
        const selectedData = indexedData[selectedSample];

        return <div className="SampleViz">
            <div className="SampleViz-select">
                Select sample: <select value={selectedSample} onChange={this.handleSelectedSampleChanged}>
                    {sampleOptions}
                </select>
            </div>
            <DivWithBullseye className="SampleViz-pane">
                <Scatterplot
                    data={selectedData}
                    width={width}
                    height={height}
                    hoveredLocation={hoveredLocation}
                    onRecordsHovered={this.handleRecordsHovered} />
            </DivWithBullseye>
            <DivWithBullseye className="SampleViz-pane">
                <RDLinearPlot
                    data={selectedData} hoveredLocation={hoveredLocation} onLocationHovered={onLocationHovered} />
                <div className="SampleViz-separator" />
                <BAFLinearPlot
                    data={selectedData} hoveredLocation={hoveredLocation} onLocationHovered={onLocationHovered} />
            </DivWithBullseye>
        </div>;
    }
}
