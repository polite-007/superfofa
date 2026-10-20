import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NewExportTab } from "./new-export-tab"
import { RecordListTab } from "./record-list-tab"
import { EXPORT_PAGE_TABS } from "./constants"
import { useExportPage } from "./use-export-page"

export function ExportView() {
  const {
    activeTab,
    setActiveTab,
    tasks,
    loading,
    draft,
    setDraft,
    precheckPreview,
    precheckDialogOpen,
    setPrecheckDialogOpen,
    submitting,
    requestCreateTask,
    confirmCreateTask,
    deleteTask,
    continueTask,
    cloneTask,
    fieldCount,
    refreshTasks,
  } = useExportPage()

  return (
    <div className="flex h-full flex-col overflow-hidden p-4">
      <Card className="flex h-full flex-col">
        <CardHeader className="shrink-0">
          <CardTitle>导出</CardTitle>
          <CardDescription>创建并管理批量导出任务</CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col gap-4">
            <TabsList className="w-fit">
              <TabsTrigger value={EXPORT_PAGE_TABS.create}>新建导出</TabsTrigger>
              <TabsTrigger value={EXPORT_PAGE_TABS.records}>导出记录</TabsTrigger>
            </TabsList>
            <TabsContent value={EXPORT_PAGE_TABS.create} className="min-h-0 flex-1">
              <NewExportTab
                draft={draft}
                setDraft={setDraft}
                fieldCount={fieldCount}
                precheckPreview={precheckPreview}
                precheckDialogOpen={precheckDialogOpen}
                setPrecheckDialogOpen={setPrecheckDialogOpen}
                submitting={submitting}
                onRequestCreateTask={requestCreateTask}
                onConfirmCreateTask={confirmCreateTask}
              />
            </TabsContent>
            <TabsContent value={EXPORT_PAGE_TABS.records} className="min-h-0 flex-1">
              <RecordListTab
                tasks={tasks}
                loading={loading}
                onRefresh={refreshTasks}
                onDelete={deleteTask}
                onContinue={continueTask}
                onClone={cloneTask}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
