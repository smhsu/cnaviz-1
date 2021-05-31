import _ from "lodash";
import { GenomicBin } from "./GenomicBin";
import { MergedGenomicBin, BinMerger } from "./BinMerger";
import { group } from "d3-array";

/**
 * Nested dictionary type.  First level key is the sample name; second level key is cluster in that sample; third level key is the chromosome in the given sample with the given cluster.
 * 
 * @typeParam T type of value stored
 */
type IndexedBioData<T> = {
    [sample: string]: {
        [cluster: string] : {
            [chr: string]: T
        }
    } 
};

/**
 * A container that stores metadata for a list of GenomicBin and allows fast queries first by sample, and then by
 * chromosome.  For applications that want a limited amount of data, pre-aggregates GenomicBin and allows fast queries
 * of that data too.
 * 
 * @author Silas Hsu
 */
export class DataWarehouse {
    /** The special chromosome name that signifies a query for the entire genome (all chromosomes). */
    public static readonly ALL_CHRS_KEY : string = ""; 
    public static readonly ALL_CLUSTERS_KEY : string = "";

    /** Indexed GenomicBin for supporting fast queries. */
    private readonly _indexedData: IndexedBioData<GenomicBin[]>;
    /** Indexed, pre-aggregated GenomicBin for supporting fast queries. */
    private readonly _indexedMergedData: IndexedBioData<MergedGenomicBin[]>;
    /** The range of read depth ratios represented in this data set.  First number is min, second is max. */
    private readonly _rdRange: [number, number];

    /**
     * Indexes, pre-aggregates, and gathers metadata for a list of GenomicBin.  Note that doing this inspects the entire
     * data set, and could be computationally costly if the data set is large.
     * 
     * 
     * 
     * @param rawData the data to process
     * @param merger aggregator to use
     * @throws {Error} if the data contains chromosome(s) with the reserved name of `DataWarehouse.ALL_CHRS_KEY`
     */
    constructor(rawData: GenomicBin[], merger=new BinMerger()) {
        const groupedBySample = _.groupBy(rawData, "SAMPLE");

        this._indexedData = {};
        this._indexedMergedData = {};
        for (const [sample, binsForSample] of Object.entries(groupedBySample)) {
            const groupedByCluster = _.groupBy(binsForSample, "CLUSTER");
            const sampleGroupedByChr = _.groupBy(binsForSample, "#CHR");

            if (DataWarehouse.ALL_CLUSTERS_KEY in  groupedByCluster) {
                throw new Error(`Data contains reserved cluster name '${DataWarehouse.ALL_CLUSTERS_KEY}'.` +
                    "Please remove or rename this chromosome from the data and try again.");
            }

            let clusterChrDict : {[cl : string] : {[chr : string] : GenomicBin[]}} = {};
            let mergedClusterChrDict : {[cl : string] : {[chr : string] : MergedGenomicBin[]}} = {};
            for (const [cluster, binsForCluster] of Object.entries(groupedByCluster)) {
                const groupedByChr = _.groupBy(binsForCluster, "#CHR");
                
                if (DataWarehouse.ALL_CHRS_KEY in groupedByChr) {
                    throw new Error(`Data contains reserved chromosome name '${DataWarehouse.ALL_CHRS_KEY}'.` +
                        "Please remove or rename this chromosome from the data and try again.");
                }

                clusterChrDict[cluster] = groupedByChr;
                mergedClusterChrDict[cluster] = _.mapValues(groupedByChr, merger.doMerge);
                clusterChrDict[cluster][DataWarehouse.ALL_CHRS_KEY] = _.flatten(Object.values(groupedByChr));
                mergedClusterChrDict[cluster][DataWarehouse.ALL_CHRS_KEY] = _.flatten(Object.values(mergedClusterChrDict[cluster]));
            }

            this._indexedData[sample] = clusterChrDict;
            this._indexedMergedData[sample] = mergedClusterChrDict;
            this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY] = sampleGroupedByChr;
            this._indexedMergedData[sample][DataWarehouse.ALL_CLUSTERS_KEY] = _.mapValues(sampleGroupedByChr, merger.doMerge);
            this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY][DataWarehouse.ALL_CHRS_KEY] = _.flatten(Object.values(sampleGroupedByChr));
                this._indexedMergedData[sample][DataWarehouse.ALL_CLUSTERS_KEY][DataWarehouse.ALL_CHRS_KEY] = _.flatten(
                Object.values(this._indexedMergedData[sample][DataWarehouse.ALL_CLUSTERS_KEY])
            );
        }

        console.log("INDEXED DATA: ", this._indexedData);

        if (rawData.length > 0) {
            this._rdRange = [_.minBy(rawData, "RD")!.RD, _.maxBy(rawData, "RD")!.RD];
        } else {
            this._rdRange = [0, 0];
        }
        console.log(this._indexedData)
        this.getChromosomeList = this.getChromosomeList.bind(this); // Needed for getAllChromosomes() to work
        this.getClusterList = this.getClusterList.bind(this); // Needed for getAllChromosomes() to work
    }

    /**
     * @return whether this instance stores any data
     */
    isEmpty(): boolean {
        return this.getSampleList().length === 0;
    }

    /**
     * Gets the range of read depth ratios represented in this data set.  Returns the result as a 2-tuple; the first
     * number is the min, and the second is the max.
     * 
     * @return the range of read depth ratios represented in this data set
     */
    getRdRange(): [number, number] {
        return [this._rdRange[0], this._rdRange[1]]; // Make a copy
    }

    /**
     * @return a list of sample names represented in this data set
     */
    getSampleList(): string[] {
        return Object.keys(this._indexedData);
    }

    /**
     * @return a list of chromosome names represented in this data set
     */
    getAllChromosomes(): string[] {
        return _.uniq(this.getSampleList().flatMap(this.getChromosomeList));
    }

    getAllClusters(): string[] {
        return _.uniq(this.getSampleList().flatMap(this.getClusterList));
    }

    getClusterList(sample: string): string[] {
        const nameList = Object.keys(this._indexedData[sample] || {});
        return nameList.filter(name => name !== DataWarehouse.ALL_CLUSTERS_KEY); // Remove the special ALL_CHRS_KEY
    }

    /**
     * Gets a list of chromosome names found in one sample.  If the sample is not in this data set, returns an empty
     * list.
     * 
     * @param sample the sample to query
     * @return a list of chromosome names represented in the query sample
     */
    getChromosomeList(sample: string): string[] {
        const nameList = Object.keys(this._indexedData[sample][DataWarehouse.ALL_CLUSTERS_KEY] || {});
        return nameList.filter(name => name !== DataWarehouse.ALL_CHRS_KEY); // Remove the special ALL_CHRS_KEY
    }

    /**
     * Gets the bin size in bases of an arbitrary data point in this data set.  Most useful if it is known that all data
     * have the same bin size.
     * 
     * @return a guess of the bin size in bases of data points in this data set.
     */
    guessBinSize(): number {
        if (this.isEmpty()) {
            return 0;
        }
        const firstSample = this.getSampleList()[0];
        const firstRecord = this.getRecords(firstSample, DataWarehouse.ALL_CHRS_KEY, DataWarehouse.ALL_CLUSTERS_KEY)[0];
        return firstRecord.END - firstRecord.START;
    }

    /**
     * Performs a query for records matching a sample and a chromosome.  To get all records matching a sample,
     * regardless of chromosome, use the special chromosome name `DataWarehouse.ALL_CHRS_KEY`.  If either sample or
     * chromosome are not present in the data, returns an empty list.
     * 
     * @param sample sample name for which to find matching records
     * @param chr chromosome name for which to find matching records
     * @return a list of matching records
     */
    getRecords(sample: string, chr: string, cluster: string): GenomicBin[] {
        return this._getData(this._indexedData, sample, chr, cluster);
    }

    /**
     * Performs a query for aggregated records matching a sample and a chromosome.  To get all records matching a
     * sample, regardless of chromosome, use the special chromosome name `DataWarehouse.ALL_CHRS_KEY`.  If either sample
     * or chromosome are not present in the data, returns an empty list.
     * 
     * @param sample sample name for which to find matching records
     * @param chr chromosome name for which to find matching records
     * @return a list of matching records
     */
    getMergedRecords(sample: string, chr: string, cluster: string): MergedGenomicBin[] {
        return this._getData(this._indexedMergedData, sample, chr, cluster);
    }

    /**
     * Helper function for performing queries.
     * 
     * @typeParam T type of value stored in the index
     * @param index the index to query
     * @param sample sample name for which to find matching records
     * @param chr chromosome name for which to find matching records
     * @return a list of matching records
     */
    private _getData<T>(index: IndexedBioData<T[]>, sample: string, chr: string, cluster: string): T[] {
        const dataForSample = index[sample][cluster] || {};
        return dataForSample[chr] || [];
    }
}
