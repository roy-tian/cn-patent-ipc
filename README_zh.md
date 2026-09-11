# cn-patent-ipc

中文版专利国际专利分类(IPC)数据包:**79,972 条**分类号(部/大类/小类/主组/
分组),含中文标题与生效版次(1985.01 → 2026.01),附国家知识产权局战略性
新兴产业(SEI)参照映射,零运行时依赖,附带 TypeScript 查询 API 与可直接执行
的 PostgreSQL 种子 SQL。[English](README.md)

- IPC:8 部 · 132 大类 · 655 小类 · 7,667 主组 · 71,510 分组
- SEI:40 个产业代码共 321 条规则;34,598 条 IPC↔SEI 映射
- 姊妹包:[`cn-divisions`](https://www.npmjs.com/package/cn-divisions)
  — 中国行政区划数据(含拼音)

## 安装

```bash
npm install cn-patent-ipc
```

要求 Node.js ≥ 18,同时支持 ESM 与 CJS。

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
// { code: "A01B1/24", type: "分组", level: 2, name: "…", version: "2006.01" }

ancestors("A01B1/24").map((e) => e.code);
// [ "A", "A01", "A01B", "A01B1/00" ]  — 结构链回溯到主组

searchByName("半导体", { type: "小类" }); // 含 H10D
byVersion("2026.01"); // 2026.01 版生效的条目
countByType(); // { 部: 8, 大类: 132, 小类: 655, 主组: 7667, 分组: 71510 }
```

注意:`ancestors` 是结构性推导(部 → 大类 → 小类 → 主组)。分组与分组之间的
嵌套关系在 IPC 数据里没有父级字段,无法推导。

## SEI API(`cn-patent-ipc/sei`)

```ts
import { seiOfIpc, ipcOfSei, seiRulesByCode } from "cn-patent-ipc/sei";

seiOfIpc("A01B"); // 精确命中该 IPC 号的 SEI 规则
ipcOfSei("2.1"); // 映射到产业代码 "2.1" 的 IPC 条目
seiRulesByCode("1.1"); // 关键词规则 —— 一个产业代码对应多条
```

映射按**精确** IPC 号匹配;如需小类级覆盖,请自行用 `ancestors` / `allIpc`
做层级展开。

## 原始数据与 SQL 种子

子路径导出暴露原始文件:

- `cn-patent-ipc/data/{ipc,sei,ipc-sei}.jsonl` — 规范数据,每行一个 JSON
  对象,按序排列
- `cn-patent-ipc/sql/postgresql/{patent_ipc,patent_sei,patent_ipc_sei}.sql`
  — 批量 `INSERT`(用 `npm run generate:sql` 重新生成)

```ts
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sqlPath = require.resolve("cn-patent-ipc/sql/postgresql/patent_ipc.sql");
```

## 数据更新

修订 JSONL 后重新生成 SQL、递增版本号,并把 `src/types.ts` 中的
`DATA_VERSION` 更新为收录的最新版次。测试固定了条目数、层级计数、映射外键
及 JSONL ↔ SQL 行数,不一致的更新会直接挂掉 CI。

## 许可

代码与数据汇编均为 MIT。数据出处(WIPO/国知局)、已知瑕疵与未收录内容见
[NOTICE.md](NOTICE.md)。
