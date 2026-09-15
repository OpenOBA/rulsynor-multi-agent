# 委托权威安全模型（Delegated Authority Security Model）

> 状态：**外挂设计文档**（工作底稿，与 RavindraAnnam 对齐中）
> 归属：组织层安全模型，正式收口后吸纳进 `rulsynor-product-spec-v2.0` 第十部分
> 关联：INV-01~05 委托权威不变量（RavindraAnnam + A2A #2031）· §6a.10 授权根源绑定（ERDL 层）· AV-01~14 对抗向量（`vectors/`）· `conformance/CONFORMANCE.md`
> 日期：2026-09-15

---

## 0. 定位与分层

组织层安全模型是「多 Agent 治理」的安全基石，属于 **Rulsynor 层（组织行为层）**，消费 ERDL 层（§6a 状态块）提供的原语：

| 层 | 归属 | 职责 | 载体 |
|---|---|---|---|
| **ERDL**（裁决层） | `erdl-language-spec` §6a | 单实例 FSM：授权状态 authorize/revoke、actor 认证、审计链、授权根源绑定 | §6a 状态块 + §6a.10 |
| **组织层**（本模型） | `rulsynor-product-spec` 第十部分 | 委派链不变量：非放大 / 溯源连续 / 窄化继承 / 传递撤销 / 能力边界 | 本外挂文档 |

**一句话**：ERDL 提供「授权状态的可验证裁决」，组织层保证「委派链的安全不变量」。本模型定义后者。

---

## 1. 总纲：委派不得制造权威（delegation must never manufacture authority）

一切委派、下达、再委托、传递委派、特权中介、下游约束变更、撤销，都不得让有效权威**超出或逃逸**起源权威链。

> `effective_authority(subject) ⊆ authority(chain)` —— 有效权威是起源权威链的**子集**，任何操作不得放大它。

---

## 2. 五条委托权威不变量（INV-01~05）

每条不变量 = 性质 + 违反形态 + 规范性断言。

### INV-01 权威不放大（authority non-amplification）

- **性质**：`effective_authority ⊆ authority(chain)`。委派方授予的权限 ⊆ 委派方自己拥有的权限；权限不能通过委派链被放大。
- **违反形态**：
  - 直接放大：delegate 授出超出自身权限（AV-01、AV-03）；
  - 传递放大：多层委派累积放大（AV-02、AV-07 深度越界）；
  - **聚合放大**（AV-09）：多个独立合法的 child grant 聚合消耗同一有界起源权威——per-hop 非放大必要但不充分，需**起源权威守恒**（aggregate conservation）。
- **规范性断言**：任何委派/下达/晋升动作后，`effective_authority(delegate) MUST ⊆ authority(chain)`；多个 child grant 对同一有界起源权威的聚合消耗 MUST 满足守恒。

### INV-02 溯源连续性（provenance continuity）

- **性质**：每个决策有连续可验证的溯源链（授权基础 → 委派 → 行使），身份绑定不可破坏。
- **违反形态**：溯源链断裂、重放已消费的委派（AV-08）、身份绑定破坏（AV-12）。
- **规范性断言**：行使权威的每个决策 MUST 能追溯到一条连续的、未被消费的授权链；行使身份 MUST 绑定到授权链声明的身份。

### INV-03 窄化继承（narrow-only constraint inheritance）

- **性质**：约束只能收窄，不能放宽。委派时施加的约束（deadline / max_autonomy / escalation_to / 范围）被继承，且下游只能进一步收窄。
- **违反形态**：下游约束移除/放宽（AV-04）。
- **规范性断言**：`constraints(delegate) MUST ⊆ constraints(delegator)`；下游约束变更 MUST NOT 放宽。

### INV-04 传递撤销（transitive revocation）

- **性质**：撤销传播到所有派生权威（含未行使的、已再委托的）。
- **违反形态**：已撤销祖先委托（再委托 1 层后 A 撤销 → C 的派生权威未失效）、陈旧负面（AV-10）、状态缺失（AV-14）、已完成动作不可逆（AV-13）。
- **规范性断言**：撤销某节点，其下游子树**全部失效**（传递闭包），无论已行使与否；撤销**不可逆**，重新可行使 MUST 走新的授权基础（§6a.10）。

### INV-05 能力边界轴（capability boundary axis）

- **性质**：权威沿 agent → skill → tool → protected-resource 只减不增。
- **违反形态**：越界（AV-06）。
- **规范性断言**：`authority(resource) MUST ⊆ authority(tool) ⊆ authority(skill) ⊆ authority(agent)`。

---

## 3. 撤销新鲜度（revocation freshness，机制中立）

- 行使依赖可撤销祖先的权威前，执行边界 MUST 确立撤销状态满足配置的新鲜度要求。
- **可见撤销的缺失 MUST NOT 单独构成持续有效**（absence of visible revocation ≠ continued validity）。
- 无法确立新鲜度 → fail closed。
- 机制中立：monotonic epoch / lease / version vector / signed status object / online introspection / 等价机制。

---

## 4. 授权根源绑定（与 §6a.10 的接口）

- ERDL 层 §6a.10 已落地「授权建立/重建的根源绑定」：单实例 FSM 的 authorize 事件 MUST 归因于授权根（authorization root），被授权主体 MUST NOT 自恢复被撤销授权。
- 本模型（组织层）消费 §6a.10 原语，裁决「谁有权建立该授权」的授权根源资格——这是执行边界/组织层的集成义务，无法确立即 fail-closed。

---

## 5. 对抗向量族（AV-01~14 + 补充）

收敛标准 = `decision` + `matched_invariant` + `first_invalid_boundary`（一个 runner 不能仅凭最终 DENY 得满分，须识别**第一个**权威转移失效的 hop）。

| 向量 | INV | 场景 | 期望 |
|---|---|---|---|
| AV-01 | INV-01 | A→B 越级 refund | DENY |
| AV-02 | INV-01 | B→C 传递放大 | DENY |
| AV-03 | INV-01 | A→B write→read 越权 | DENY |
| AV-04 | INV-03 | B→C 金额放宽 | DENY |
| AV-05 | INV-04 | P→A 撤销后行使派生权威 | DENY |
| AV-06 | INV-05 | T→R write→read 越界 | DENY |
| AV-07 | INV-01 | D→E 委派深度越界 | DENY |
| AV-08 | INV-02 | A→B 重放已消费委派 | DENY |
| AV-09 | INV-01 | 聚合消耗超共享预算 | DENY |
| AV-10 | INV-04 | 陈旧负面（stale-negative）| DENY |
| AV-11 | INV-01 | 委派不可委派的基础 | DENY |
| AV-12 | INV-02 | 身份绑定破坏 | DENY |
| AV-13 | INV-04 | 撤销前已完成动作不可逆 | DENY |
| AV-14 | INV-04 | 状态缺失（unavailable）| DENY |
| **AV-15**（新增）| INV-01/04 | issue #3：撤销后 B 自触发 re-authorize | **DENY** |
| **AV-16**（新增）| INV-01 | issue #3 正向控制：P 授权根重建 → B 行使 | **ALLOW** |

---

## 6. 收口状态

- [ ] 本模型定稿（与 Annam 对齐）
- [ ] AV-15 / AV-16 向量落地进 `vectors/`
- [ ] 五对抗向量族进 erdl-vectors（独立 runner 可跑）
- [ ] 吸纳进 `rulsynor-product-spec-v2.0` 第十部分（正式收口）
