import React from "react"
import {GenomicBin} from "../model/GenomicBin";
import {toCSV} from "../util";
import spinner from "../loading-small.gif";
import {TEMPORARY_COLUMNS} from "../constants";

interface Props {
    data : readonly GenomicBin[];
    logData: any[];
    fileName: string;
    onExport: () => void;
}

interface State {
    loading: boolean;
}

function convertToTsv(data: readonly GenomicBin[]): Promise<string> {
    return new Promise((resolve, reject) => {
        let keys = Object.keys(data[0]);
        const headings = keys.filter(d => !TEMPORARY_COLUMNS.has(d));//keys.slice(0, keys.length-3);

        // iterate over the data
        const rows : string = toCSV(data, headings, "\t", " ");
        let csvContent : any = rows;
        resolve(csvContent);
    })  
}

export class CSV extends React.Component<Props, State> {
    private csvLink: any;
    constructor(props: Props) {
        super(props);
        this.csvLink = React.createRef();
        this.state = {
            loading: false
        }
        this.handleFileDownload = this.handleFileDownload.bind(this);
    }

    async handleFileDownload() {
        this.setState({loading: true});

        let csvContent = "";
        try {
            csvContent = await convertToTsv(this.props.data);
        } catch(error) {
            console.error(error);
            return;
        }
        
        var hiddenElement = document.createElement('a');  
        hiddenElement.href = 'data:text/tab-separated-values,' + encodeURIComponent(csvContent);  
        
        // provide the name for the CSV file to be downloaded
        // Assume that underscore is not in actual filename (only used to separate datetime)
        const fileName = this.props.fileName;
        let nameExt = fileName.split("."); 
        let newFileName = "";
        for(let i = 0; i < nameExt.length-1; i++) {
            newFileName += nameExt[i];
            if(i !== nameExt.length - 2) {
                newFileName += ".";
            }
        }

        let removeDateTime = newFileName.split("_");

        const currentDate = new Date();
        let month = String(currentDate.getMonth() + 1);
        if(month.length < 2) {
            month = "0" + month;
        }

        let day = String(currentDate.getDate());
        if(day.length < 2) {
            day = "0" + day;
        }

        let date = currentDate.getFullYear()+ month + day; 
        let hrs = String(currentDate.getHours() )
        let min = String(currentDate.getMinutes());
        let sec = String(currentDate.getSeconds());
        if(hrs.length < 2) {
            hrs = "0" + hrs;
        }
        if(min.length < 2) {
            min = "0" + min;
        }
        if(sec.length < 2) {
            sec = "0" + sec;
        }

        let time = hrs + min + sec;
        
        let actions = [];
        for(let action of this.props.logData) {
            actions.push(action.action);
        }
        let logFileContent = "";
        logFileContent = actions.join("\n");
        var hiddenElement2 = document.createElement('a');  
        hiddenElement2.href = 'data:text/plain,' + encodeURIComponent(logFileContent);
        hiddenElement2.download = removeDateTime[0] + "-log_" + date + "_" + time;  
        hiddenElement2.click();

        hiddenElement.download = removeDateTime[0] + "_" + date + time + ".tsv";
        hiddenElement.click();

        this.setState({loading: false})
    }

    render() {
        let csvButton = <div>
                
            <button type="button" onClick={() => {
                this.props.onExport();
                this.handleFileDownload()
            }} style={{display: "none"}}>Export</button>
            {this.state.loading && <div>Reading file... <img src={spinner} alt="Loading" /></div>}
        </div>
        return csvButton;
    }
}
