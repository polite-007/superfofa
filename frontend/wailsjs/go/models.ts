export namespace app {
	
	export class ReadyUpdate {
	    version: string;
	    asset_name: string;
	    package_path: string;
	    staged_path: string;
	    target_path: string;
	    updater_path: string;
	    launch_path: string;
	    backup_path: string;
	
	    static createFrom(source: any = {}) {
	        return new ReadyUpdate(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.version = source["version"];
	        this.asset_name = source["asset_name"];
	        this.package_path = source["package_path"];
	        this.staged_path = source["staged_path"];
	        this.target_path = source["target_path"];
	        this.updater_path = source["updater_path"];
	        this.launch_path = source["launch_path"];
	        this.backup_path = source["backup_path"];
	    }
	}
	export class UpdateInfo {
	    current_version: string;
	    latest_version: string;
	    has_update: boolean;
	    release_url: string;
	    download_url: string;
	    asset_name: string;
	    checksum_url: string;
	    expected_sha256: string;
	    release_notes: string;
	    auto_install_available: boolean;
	    manual_only_reason: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.current_version = source["current_version"];
	        this.latest_version = source["latest_version"];
	        this.has_update = source["has_update"];
	        this.release_url = source["release_url"];
	        this.download_url = source["download_url"];
	        this.asset_name = source["asset_name"];
	        this.checksum_url = source["checksum_url"];
	        this.expected_sha256 = source["expected_sha256"];
	        this.release_notes = source["release_notes"];
	        this.auto_install_available = source["auto_install_available"];
	        this.manual_only_reason = source["manual_only_reason"];
	    }
	}
	export class UpdateState {
	    phase: string;
	    percent?: number;
	    downloaded?: number;
	    total?: number;
	    message?: string;
	    info?: UpdateInfo;
	    ready?: ReadyUpdate;
	    manual_only_reason?: string;
	    auto_toast?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UpdateState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.phase = source["phase"];
	        this.percent = source["percent"];
	        this.downloaded = source["downloaded"];
	        this.total = source["total"];
	        this.message = source["message"];
	        this.info = this.convertValues(source["info"], UpdateInfo);
	        this.ready = this.convertValues(source["ready"], ReadyUpdate);
	        this.manual_only_reason = source["manual_only_reason"];
	        this.auto_toast = source["auto_toast"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace model {
	
	export class AccountSnapshot {
	    username: string;
	    category: string;
	    fcoin: number;
	    fofa_point: number;
	    remain_free_point: number;
	    remain_api_query: number;
	    remain_api_data: number;
	    isvip: boolean;
	    vip_level: number;
	    is_verified: boolean;
	
	    static createFrom(source: any = {}) {
	        return new AccountSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.username = source["username"];
	        this.category = source["category"];
	        this.fcoin = source["fcoin"];
	        this.fofa_point = source["fofa_point"];
	        this.remain_free_point = source["remain_free_point"];
	        this.remain_api_query = source["remain_api_query"];
	        this.remain_api_data = source["remain_api_data"];
	        this.isvip = source["isvip"];
	        this.vip_level = source["vip_level"];
	        this.is_verified = source["is_verified"];
	    }
	}
	export class AddAccountReq {
	    email: string;
	    key: string;
	    remark: string;
	
	    static createFrom(source: any = {}) {
	        return new AddAccountReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.email = source["email"];
	        this.key = source["key"];
	        this.remark = source["remark"];
	    }
	}
	export class CloneExportTaskReq {
	    task_id: string;
	
	    static createFrom(source: any = {}) {
	        return new CloneExportTaskReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.task_id = source["task_id"];
	    }
	}
	export class ExportTimeRange {
	    preset: string;
	    start: string;
	    end: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportTimeRange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.preset = source["preset"];
	        this.start = source["start"];
	        this.end = source["end"];
	    }
	}
	export class ExportField {
	    key: string;
	    label: string;
	    fofa_field: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportField(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.key = source["key"];
	        this.label = source["label"];
	        this.fofa_field = source["fofa_field"];
	    }
	}
	export class CreateExportTaskReq {
	    task_name: string;
	    source: string;
	    input_type: string;
	    text: string;
	    source_file_name: string;
	    fields: ExportField[];
	    time_range: ExportTimeRange;
	    normalized_items: string[];
	
	    static createFrom(source: any = {}) {
	        return new CreateExportTaskReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.task_name = source["task_name"];
	        this.source = source["source"];
	        this.input_type = source["input_type"];
	        this.text = source["text"];
	        this.source_file_name = source["source_file_name"];
	        this.fields = this.convertValues(source["fields"], ExportField);
	        this.time_range = this.convertValues(source["time_range"], ExportTimeRange);
	        this.normalized_items = source["normalized_items"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class ExportPrecheckReq {
	    source: string;
	    input_type: string;
	    text: string;
	    source_file_name: string;
	    task_name: string;
	    fields: ExportField[];
	    time_range: ExportTimeRange;
	
	    static createFrom(source: any = {}) {
	        return new ExportPrecheckReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.source = source["source"];
	        this.input_type = source["input_type"];
	        this.text = source["text"];
	        this.source_file_name = source["source_file_name"];
	        this.task_name = source["task_name"];
	        this.fields = this.convertValues(source["fields"], ExportField);
	        this.time_range = this.convertValues(source["time_range"], ExportTimeRange);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExportPrecheckResult {
	    task_name: string;
	    source: string;
	    input_type: string;
	    total_lines: number;
	    valid_items: number;
	    duplicate_items: number;
	    invalid_items: number;
	    invalid_examples: string[];
	    normalized_items: string[];
	
	    static createFrom(source: any = {}) {
	        return new ExportPrecheckResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.task_name = source["task_name"];
	        this.source = source["source"];
	        this.input_type = source["input_type"];
	        this.total_lines = source["total_lines"];
	        this.valid_items = source["valid_items"];
	        this.duplicate_items = source["duplicate_items"];
	        this.invalid_items = source["invalid_items"];
	        this.invalid_examples = source["invalid_examples"];
	        this.normalized_items = source["normalized_items"];
	    }
	}
	export class ExportTaskItem {
	    id: string;
	    task_id: string;
	    index: number;
	    raw_input: string;
	    normalized_input: string;
	    normalized_query: string;
	    status: string;
	    next_page: number;
	    exported_rows: number;
	    error_message: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportTaskItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.task_id = source["task_id"];
	        this.index = source["index"];
	        this.raw_input = source["raw_input"];
	        this.normalized_input = source["normalized_input"];
	        this.normalized_query = source["normalized_query"];
	        this.status = source["status"];
	        this.next_page = source["next_page"];
	        this.exported_rows = source["exported_rows"];
	        this.error_message = source["error_message"];
	    }
	}
	export class ExportTask {
	    id: string;
	    name: string;
	    source: string;
	    input_type: string;
	    source_file_name: string;
	    status: string;
	    pause_reason: string;
	    fail_reason: string;
	    message: string;
	    query_text: string;
	    raw_input: string;
	    time_range: ExportTimeRange;
	    fields: ExportField[];
	    total_items: number;
	    completed_items: number;
	    current_item_index: number;
	    current_item_page: number;
	    exported_rows: number;
	    checkpoint_path: string;
	    output_path: string;
	    created_at: string;
	    updated_at: string;
	    items?: ExportTaskItem[];
	
	    static createFrom(source: any = {}) {
	        return new ExportTask(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.source = source["source"];
	        this.input_type = source["input_type"];
	        this.source_file_name = source["source_file_name"];
	        this.status = source["status"];
	        this.pause_reason = source["pause_reason"];
	        this.fail_reason = source["fail_reason"];
	        this.message = source["message"];
	        this.query_text = source["query_text"];
	        this.raw_input = source["raw_input"];
	        this.time_range = this.convertValues(source["time_range"], ExportTimeRange);
	        this.fields = this.convertValues(source["fields"], ExportField);
	        this.total_items = source["total_items"];
	        this.completed_items = source["completed_items"];
	        this.current_item_index = source["current_item_index"];
	        this.current_item_page = source["current_item_page"];
	        this.exported_rows = source["exported_rows"];
	        this.checkpoint_path = source["checkpoint_path"];
	        this.output_path = source["output_path"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	        this.items = this.convertValues(source["items"], ExportTaskItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class FofaAccount {
	    id: string;
	    email: string;
	    key: string;
	    remark: string;
	    status: string;
	    account?: AccountSnapshot;
	    last_check: string;
	    err_msg: string;
	    created_at: string;
	    updated_at: string;
	
	    static createFrom(source: any = {}) {
	        return new FofaAccount(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.email = source["email"];
	        this.key = source["key"];
	        this.remark = source["remark"];
	        this.status = source["status"];
	        this.account = this.convertValues(source["account"], AccountSnapshot);
	        this.last_check = source["last_check"];
	        this.err_msg = source["err_msg"];
	        this.created_at = source["created_at"];
	        this.updated_at = source["updated_at"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HostHistoryItem {
	    id: string;
	    host: string;
	    ts: number;
	
	    static createFrom(source: any = {}) {
	        return new HostHistoryItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.host = source["host"];
	        this.ts = source["ts"];
	    }
	}
	export class HostProduct {
	    product: string;
	    category: string;
	    level: number;
	    sort_hard_code: number;
	
	    static createFrom(source: any = {}) {
	        return new HostProduct(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.product = source["product"];
	        this.category = source["category"];
	        this.level = source["level"];
	        this.sort_hard_code = source["sort_hard_code"];
	    }
	}
	export class HostPort {
	    port: number;
	    protocol: string;
	    products: HostProduct[];
	
	    static createFrom(source: any = {}) {
	        return new HostPort(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.port = source["port"];
	        this.protocol = source["protocol"];
	        this.products = this.convertValues(source["products"], HostProduct);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class HostReq {
	    host: string;
	    detail: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HostReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.detail = source["detail"];
	    }
	}
	export class HostResult {
	    host: string;
	    ip: string;
	    asn: number;
	    org: string;
	    country_name: string;
	    country_code: string;
	    protocol: string[];
	    port: number[];
	    category: string[];
	    product: string[];
	    ports: HostPort[];
	    update_time: string;
	    detail: boolean;
	    account_id: string;
	    account_email: string;
	    elapsed_ms: number;
	
	    static createFrom(source: any = {}) {
	        return new HostResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.host = source["host"];
	        this.ip = source["ip"];
	        this.asn = source["asn"];
	        this.org = source["org"];
	        this.country_name = source["country_name"];
	        this.country_code = source["country_code"];
	        this.protocol = source["protocol"];
	        this.port = source["port"];
	        this.category = source["category"];
	        this.product = source["product"];
	        this.ports = this.convertValues(source["ports"], HostPort);
	        this.update_time = source["update_time"];
	        this.detail = source["detail"];
	        this.account_id = source["account_id"];
	        this.account_email = source["account_email"];
	        this.elapsed_ms = source["elapsed_ms"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HotTrend {
	    date: string;
	    value: number;
	    is_mark: boolean;
	
	    static createFrom(source: any = {}) {
	        return new HotTrend(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.value = source["value"];
	        this.is_mark = source["is_mark"];
	    }
	}
	export class HotSearchItem {
	    app: string;
	    query_string: string;
	    asset_count: number;
	    is_hot: boolean;
	    hot_trend: HotTrend[];
	
	    static createFrom(source: any = {}) {
	        return new HotSearchItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.app = source["app"];
	        this.query_string = source["query_string"];
	        this.asset_count = source["asset_count"];
	        this.is_hot = source["is_hot"];
	        this.hot_trend = this.convertValues(source["hot_trend"], HotTrend);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class KeyConfig {
	    mode: string;
	    base_url: string;
	    proxy: string;
	    active_id: string;
	    single_id: string;
	    pool_ids: string[];
	    fofa_web_token: string;
	
	    static createFrom(source: any = {}) {
	        return new KeyConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.mode = source["mode"];
	        this.base_url = source["base_url"];
	        this.proxy = source["proxy"];
	        this.active_id = source["active_id"];
	        this.single_id = source["single_id"];
	        this.pool_ids = source["pool_ids"];
	        this.fofa_web_token = source["fofa_web_token"];
	    }
	}
	export class QueryHistoryItem {
	    id: string;
	    query: string;
	    ts: number;
	
	    static createFrom(source: any = {}) {
	        return new QueryHistoryItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.query = source["query"];
	        this.ts = source["ts"];
	    }
	}
	export class SearchFofaReq {
	    query: string;
	    fields: string;
	    size: number;
	    page: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchFofaReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.fields = source["fields"];
	        this.size = source["size"];
	        this.page = source["page"];
	    }
	}
	export class SearchFofaResult {
	    query: string;
	    mode: string;
	    page: number;
	    page_size: number;
	    total: number;
	    returned: number;
	    fields: string[];
	    results: any[];
	    account_id: string;
	    account_email: string;
	    elapsed_ms: number;
	
	    static createFrom(source: any = {}) {
	        return new SearchFofaResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.mode = source["mode"];
	        this.page = source["page"];
	        this.page_size = source["page_size"];
	        this.total = source["total"];
	        this.returned = source["returned"];
	        this.fields = source["fields"];
	        this.results = source["results"];
	        this.account_id = source["account_id"];
	        this.account_email = source["account_email"];
	        this.elapsed_ms = source["elapsed_ms"];
	    }
	}
	export class StatsSubItem {
	    name: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new StatsSubItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	    }
	}
	export class StatsAggItem {
	    name: string;
	    count: number;
	    regions?: StatsSubItem[];
	
	    static createFrom(source: any = {}) {
	        return new StatsAggItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.count = source["count"];
	        this.regions = this.convertValues(source["regions"], StatsSubItem);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StatsFofaReq {
	    query: string;
	    fields: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new StatsFofaReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.fields = source["fields"];
	        this.size = source["size"];
	    }
	}
	export class StatsFofaResult {
	    query: string;
	    fields: string[];
	    size: number;
	    total: number;
	    returned: Record<string, number>;
	    distinct: Record<string, number>;
	    aggs: Record<string, Array<StatsAggItem>>;
	    lastupdatetime: string;
	    account_id: string;
	    account_email: string;
	    elapsed_ms: number;
	
	    static createFrom(source: any = {}) {
	        return new StatsFofaResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.query = source["query"];
	        this.fields = source["fields"];
	        this.size = source["size"];
	        this.total = source["total"];
	        this.returned = source["returned"];
	        this.distinct = source["distinct"];
	        this.aggs = this.convertValues(source["aggs"], Array<StatsAggItem>, true);
	        this.lastupdatetime = source["lastupdatetime"];
	        this.account_id = source["account_id"];
	        this.account_email = source["account_email"];
	        this.elapsed_ms = source["elapsed_ms"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class UpdateAccountReq {
	    id: string;
	    remark: string;
	
	    static createFrom(source: any = {}) {
	        return new UpdateAccountReq(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.remark = source["remark"];
	    }
	}

}

