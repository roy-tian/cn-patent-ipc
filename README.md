# cn-patent-ipc

[![npm](https://img.shields.io/npm/v/cn-patent-ipc)](https://www.npmjs.com/package/cn-patent-ipc)
![node](https://img.shields.io/node/v/cn-patent-ipc)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![module](https://img.shields.io/badge/module-ESM%20%7C%20CJS-blue)
![types](https://img.shields.io/npm/types/cn-patent-ipc)
[![license](https://img.shields.io/npm/l/cn-patent-ipc)](LICENSE)

中文版国际专利分类(IPC)数据包:含中文标题与生效版次(1985.01 → 2026.01),附
国家知识产权局战略性新兴产业(SEI)参照映射,提供 TypeScript 查询 API 与
PostgreSQL 种子 SQL。[English](README_en.md)

- IPC:79,978 条,即 8 部 · 132 大类 · 655 小类 · 7,668 主组 · 71,515 分组
- SEI:40 个产业代码、321 条规则、34,598 条 IPC↔SEI 映射
- 姊妹包:[`cn-divisions`](https://www.npmjs.com/package/cn-divisions),中国
  行政区划数据(含拼音)

## 安装

```bash
npm install cn-patent-ipc
```

版本变更与升级步骤见 [CHANGELOG.md](CHANGELOG.md)(英文)。

## IPC API

```ts
import {
  allIpc,
  lookup,
  ancestors,
  searchByName,
  byVersion,
  countByType,
} from "cn-patent-ipc";

lookup("A01B1/24");
// { code: "A01B1/24", type: "分组", level: 1, name: "处理草地或草坪用的犁", version: "2006.01" }

ancestors("A01B1/24").map((e) => e.code); // ["A", "A01", "A01B", "A01B1/00"]
searchByName("半导体", { type: "小类" }); // 按标题子串搜索,结果含 H10D
byVersion("2026.01"); // 2026.01 版生效的条目
countByType(); // 各层级条目数
```

- `ancestors` 按结构推导到主组为止,分组之间的嵌套在数据中没有记录;代码不存在
  时返回空数组。
- `searchByName` 的搜索词为空或纯空白时抛出 `TypeError`。
- 条目是冻结对象,类型为 `readonly`。`allIpc()` 返回全量共享数组,其余函数返回
  新数组。

## SEI API

```ts
import { seiOfIpc, ipcOfSei, seiRulesByCode } from "cn-patent-ipc/sei";

seiOfIpc("A01B"); // 命中该 IPC 号的 SEI 规则
ipcOfSei("2.1"); // 映射到产业代码 2.1 的 IPC 条目
seiRulesByCode("1.1"); // 该产业代码的全部关键词规则
```

映射只做精确匹配。需要按小类覆盖时,自行用 `ancestors` 或 `allIpc` 展开。

## 原始数据与 SQL 种子

- `cn-patent-ipc/data/{ipc,sei,ipc-sei}.jsonl`:规范数据,每行一个 JSON 对象,
  已排序。
- `cn-patent-ipc/sql/postgresql/{patent_ipc,patent_sei,patent_ipc_sei}.sql`:
  PostgreSQL 种子,自带建表语句与索引。先导入 `patent_ipc` 和 `patent_sei`,再
  导入 `patent_ipc_sei`。

种子可重复导入:按主键 upsert,新版会更新有变化的行,但不会删除旧行。自行建表
时,`code` 和 `id` 须有主键或唯一约束。文件路径可用
`require.resolve("cn-patent-ipc/sql/postgresql/patent_ipc.sql")` 取得,ESM 中
先用 `createRequire` 创建 `require`。

## 许可

MIT。数据来源、已知瑕疵与未收录内容见 [NOTICE.md](NOTICE.md)。
