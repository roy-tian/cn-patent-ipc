/** IPC 条目层级:部(如 A)、大类(A01)、小类(A01B)、主组(A01B1/00)、分组(A01B1/02)。 */
export type IpcType = "部" | "大类" | "小类" | "主组" | "分组";

/** 一条 IPC 分类条目,字段与 data/ipc.jsonl 逐行对应。运行时为冻结对象,故字段均为 readonly。 */
export interface IpcEntry {
  /** IPC 分类号,如 "A01B1/02"。 */
  readonly code: string;
  readonly type: IpcType;
  /** 圆点层级:主组为 0,分组为 1-9;部/大类/小类为 null,少数分组因上游缺失也为 null(见 NOTICE.md)。 */
  readonly level: number | null;
  /** 分类标题(中文),少数条目为空串(上游数据如此,见 NOTICE.md)。 */
  readonly name: string;
  /** 该条目生效的 IPC 版次,如 "2006.01";部分条目为 null。 */
  readonly version: string | null;
}

/** 一条战略性新兴产业(SEI)分类规则,字段与 data/sei.jsonl 逐行对应。 */
export interface SeiRule {
  readonly id: number;
  /** SEI 产业代码,如 "1.1";同一代码可对应多条关键词规则。 */
  readonly seiCode: string;
  readonly seiName: string;
  readonly keywords: string | null;
}

/** IPC↔SEI 映射,字段与 data/ipc-sei.jsonl 逐行对应。 */
export interface IpcSeiMapping {
  readonly ipcCode: string;
  readonly seiId: number;
}

/** 数据快照标识:收录的最新 IPC 版次(1985.01 起逐版累积),详见 NOTICE.md。 */
export const DATA_VERSION = "2026.01";
