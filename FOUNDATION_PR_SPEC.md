## Foundation PR: TreeView Consolidation and Mappers

Branch: `feat/treeview-foundation`

Scope:
- Freeze shared TreeView API and introduce reusable mapping utilities for hierarchical data.
- Align one representative admin page to the shared TreeView usage pattern to set the standard for parallel refactors.

Changes included:
1) UI utility
   - `UI/src/utils/treeMappers.ts`
     - `mapApiTreeToUiNodes(data, typeResolver)` generic mapper from API nested tree (`TreeNodeData[]`) to UI `TreeNode[]`.
     - Provided resolvers: `universitiesHierarchyResolver`, `schoolsHierarchyResolver`, `categoriesHierarchyResolver`, `geographicHierarchyResolver`.

2) Academic Persons page alignment
   - `UI/src/components/pages/AdminAcademicPersonsPage.tsx`
     - Replace incorrect usage of TreeView props (now uses `nodes` instead of non-existent `data`).
     - Provide minimal `type` mapping in converted nodes for consistent iconography.

Non-goals (do NOT change in this PR):
- No edits to `UI/src/components/ui/TreeView/TreeView.tsx` or `UI/src/types/tree.ts` (API is considered frozen for downstream parallel work).
- No broad refactors of other admin pages yet.

Acceptance criteria:
- Academic Persons "tree" view renders without runtime errors and respects search/expand behavior.
- Lint passes for changed files.
- The mappers compile and export without unused errors; they are ready for import by other pages.

Follow-up PR responsibilities (parallelizable):
1) Agent A (Institutions stack)
   - Refactor `AdminUniversitiesPage.tsx`, `AdminFacultiesPage.tsx`, `AdminDepartmentsPage.tsx`, `AdminSchoolsPage.tsx` to use shared `TreeView` for tree mode.
   - Use `mapApiTreeToUiNodes` with `universitiesHierarchyResolver` (and `schoolsHierarchyResolver` where applicable).
   - Keep list/table modes unchanged.

2) Agent B (Taxonomies)
   - Refactor `AdminCategoriesPage.tsx` to use shared `TreeView` (tree mode).
   - Use `mapApiTreeToUiNodes` + `categoriesHierarchyResolver`.

3) Agent C (Geography)
   - Refactor `AdminGeographicEntitiesPage.tsx` to use shared `TreeView` (tree mode and selection modals if desired).
   - Use `mapApiTreeToUiNodes` + `geographicHierarchyResolver`.

Coordination and conflict-avoidance:
- All agents must branch off `feat/treeview-foundation` AFTER it merges.
- Do not modify `TreeView`, `types/tree.ts`, or `utils/treeMappers.ts` in follow-up PRs. If an enhancement is needed, coordinate a separate small PR first.
- Limit diffs to the page(s) owned by the agent; avoid formatting unrelated code.
- Rebase each PR on latest main before review.

Testing and validation checklist per agent:
- Tree mode loads from existing API calls; node labels and expansion state behave as before.
- Search within tree mode operates (TreeView built-in search) or page-level filters remain unchanged.
- No regressions in list/table modes.

