import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Space,
  Spin,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactDiffViewer from 'react-diff-viewer-continued';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PlanDiff from '@/components/PlanDiff';
import { useParams, useNavigate } from 'react-router-dom';
import {
  confirmPlanSuggestion,
  createPlanFeedback,
  fetchPlanDetail,
  rollbackPlanVersion,
  updatePlan,
  updatePlanSuggestion,
} from '@/api/plans';
import type {
  PlanDetail,
  PlanSuggestion,
  PlanVersionSource,
  SuggestionTriggerType,
} from '@/types';
import './index.css';

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  reviewing: { label: '评审中', color: 'blue' },
  approved: { label: '已批准', color: 'green' },
  archived: { label: '已归档', color: 'default' },
};

const SOURCE_META: Record<PlanVersionSource | string, { label: string; color: string }> = {
  initial: { label: '初始导入', color: 'blue' },
  manual: { label: '人工编辑', color: 'geekblue' },
  ai_adopted: { label: 'AI采纳', color: 'purple' },
  rollback: { label: '回滚', color: 'orange' },
};

const TRIGGER_META: Record<SuggestionTriggerType | string, { label: string; color: string }> = {
  data_change: { label: '数据变化', color: 'blue' },
  leader_feedback: { label: '领导意见', color: 'volcano' },
  manual: { label: '手动', color: 'cyan' },
};

const SUGGESTION_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'orange' },
  adopted: { label: '已采纳', color: 'green' },
  rejected: { label: '已驳回', color: 'default' },
};

const FEEDBACK_STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'orange' },
  read: { label: '已读', color: 'blue' },
  handled: { label: '已处理', color: 'green' },
};

// 后端状态可能存英文或中文，统一判断
const isPendingSuggestion = (status?: string | null) =>
  status === 'pending' || status === '待确认';

function fmtTime(v?: string) {
  return v ? String(v).replace('T', ' ').slice(0, 19) : '-';
}

function MarkdownView({ children }: { children: string }) {
  return (
    <div className="plan-markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

const diffStyles = {
  contentText: { fontSize: '12px', lineHeight: '1.7' },
  gutter: { minWidth: 28 },
  addedLine: { background: '#e6ffed' },
  removedLine: { background: '#ffeef0' },
  wordAdded: { background: '#95dca0', fontWeight: 700, borderRadius: 2, padding: '0 2px' },
  wordRemoved: { background: '#f5a8b3', textDecoration: 'line-through', borderRadius: 2, padding: '0 2px' },
};

function SuggestionCard({
  item,
  onViewDiff,
  onConfirm,
}: {
  item: PlanSuggestion;
  onViewDiff: (item: PlanSuggestion) => void;
  onConfirm: (id: PlanSuggestion['id'], action: 'adopt' | 'reject') => void;
}) {
  const t = TRIGGER_META[item.trigger_type] ?? { label: item.trigger_type, color: 'default' };
  const s = SUGGESTION_STATUS_META[item.status] ?? { label: item.status, color: 'default' };
  return (
    <Card size="small" style={{ marginBottom: 12 }}>
      <Space wrap style={{ marginBottom: 4 }}>
        <Tag color={t.color}>{t.label}</Tag>
        <Tag color={s.color}>{s.label}</Tag>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {fmtTime(item.created_at)}
        </Typography.Text>
      </Space>
      {item.trigger_detail && (
        <Typography.Paragraph style={{ marginBottom: 8 }} type="secondary">
          触发说明：{item.trigger_detail}
        </Typography.Paragraph>
      )}
      <Space style={{ marginBottom: 8 }}>
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => onViewDiff(item)}>
          查看对比（大窗）
        </Button>
      </Space>
      <details>
        <summary style={{ cursor: 'pointer', color: '#1677ff', marginBottom: 8, fontSize: 12 }}>
          展开建议全文（小窗预览）
        </summary>
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <MarkdownView>{item.suggestion_md || ''}</MarkdownView>
        </div>
      </details>
      {isPendingSuggestion(item.status) && (
        <Space style={{ marginTop: 8 }}>
          <Popconfirm
            title="确认采纳该建议？"
            onConfirm={() => onConfirm(item.id, 'adopt')}
          >
            <Button type="primary" size="small">
              采纳
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认驳回该建议？"
            onConfirm={() => onConfirm(item.id, 'reject')}
          >
            <Button size="small" danger>
              驳回
            </Button>
          </Popconfirm>
        </Space>
      )}
      {item.status !== 'pending' && item.confirmed_by && (
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
          处理人：{item.confirmed_by}
          {item.confirmed_at ? ` · ${fmtTime(item.confirmed_at)}` : ''}
        </Typography.Text>
      )}
    </Card>
  );
}

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackAuthor, setFeedbackAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [diffItem, setDiffItem] = useState<PlanSuggestion | null>(null);
  const [diffFormat, setDiffFormat] = useState<'md' | 'text'>('md');
  const [editingDiff, setEditingDiff] = useState(false);
  const [diffEditText, setDiffEditText] = useState('');
  const [savingDiffEdit, setSavingDiffEdit] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchPlanDetail(id)
      .then((d) => {
        setDetail(d);
        setContent(d?.content_md ?? '');
      })
      .catch(() => {
        setDetail(null);
        setError(`后端服务不可用（GET /api/v1/plans/${id}），无法加载方案详情。`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updatePlan(id, { content_md: content });
      message.success('保存成功');
      load();
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSaving(false);
    }
  };

  const handleRollback = async (versionNo: number) => {
    if (!id) return;
    try {
      await rollbackPlanVersion(id, versionNo);
      message.success(`已回滚到版本 v${versionNo}`);
      load();
    } catch {
      /* 拦截器已提示 */
    }
  };

  const handleFeedback = async () => {
    if (!id) return;
    if (!feedbackContent.trim() || !feedbackAuthor.trim()) {
      message.warning('请填写意见内容与提交人');
      return;
    }
    setSubmitting(true);
    try {
      await createPlanFeedback(id, { content: feedbackContent.trim(), author: feedbackAuthor.trim() });
      message.success('意见已提交');
      setFeedbackContent('');
      load();
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmSuggestion = async (sid: PlanSuggestion['id'], action: 'adopt' | 'reject') => {
    try {
      await confirmPlanSuggestion(sid, { action, confirmed_by: 'admin' });
      message.success(action === 'adopt' ? '已采纳' : '已驳回');
      load();
    } catch {
      /* 拦截器已提示 */
    }
  };

  const handleSaveDiffEdit = async () => {
    if (!diffItem) return;
    if (!diffEditText.trim()) {
      message.warning('建议内容不能为空');
      return;
    }
    setSavingDiffEdit(true);
    try {
      await updatePlanSuggestion(diffItem.id, { suggestion_md: diffEditText });
      message.success('建议已更新');
      setEditingDiff(false);
      load();
      setDiffItem({ ...diffItem, suggestion_md: diffEditText });
    } catch {
      /* 拦截器已提示 */
    } finally {
      setSavingDiffEdit(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/plans')} style={{ marginBottom: 16 }}>
          返回列表
        </Button>
        <Alert type="warning" showIcon message="加载失败" description={error ?? '方案不存在'} />
      </div>
    );
  }

  const statusMeta = STATUS_META[detail.status] ?? { label: detail.status, color: 'default' };
  const pendingCount = (detail.suggestions ?? []).filter((s) => isPendingSuggestion(s.status)).length;

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/plans')}>
          返回列表
        </Button>
        <Button icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap align="center" style={{ marginBottom: 8 }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {detail.title}
          </Typography.Title>
          <Tag color="geekblue">{detail.category}</Tag>
          <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
        </Space>
        <Descriptions size="small" column={3}>
          <Descriptions.Item label="关联域">{detail.related_domains || '-'}</Descriptions.Item>
          <Descriptions.Item label="负责人">
            {detail.owner || '-'}
            {detail.owner_email ? `（${detail.owner_email}）` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">{fmtTime(detail.updated_at)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16}>
        <Col xs={24} xl={14}>
          <Card
            title="方案内容（Markdown）"
            extra={
              <Popconfirm title="确认保存当前内容？" onConfirm={handleSave}>
                <Button type="primary" size="small" loading={saving}>
                  保存
                </Button>
              </Popconfirm>
            }
          >
            <Tabs
              items={[
                {
                  key: 'edit',
                  label: '编辑',
                  children: (
                    <Input.TextArea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={20}
                      placeholder="使用 Markdown 撰写方案内容…"
                      className="plan-md-editor"
                    />
                  ),
                },
                {
                  key: 'preview',
                  label: '预览',
                  children:
                    content.trim() ? (
                      <MarkdownView>{content}</MarkdownView>
                    ) : (
                      <Empty description="暂无内容" />
                    ),
                },
              ]}
            />
          </Card>

          <Card title="版本历史" style={{ marginTop: 16 }}>
            {(detail.versions ?? []).length ? (
              <Timeline
                items={(detail.versions ?? []).map((v) => {
                  const m = SOURCE_META[v.source] ?? { label: v.source, color: 'default' };
                  return {
                    color: v.source === 'rollback' ? 'red' : 'blue',
                    children: (
                      <div>
                        <Space wrap>
                          <Typography.Text strong>v{v.version_no}</Typography.Text>
                          <Tag color={m.color}>{m.label}</Tag>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {v.created_by ? `${v.created_by} · ` : ''}
                            {fmtTime(v.created_at)}
                          </Typography.Text>
                          <Popconfirm
                            title={`确认回滚到 v${v.version_no}？`}
                            onConfirm={() => handleRollback(v.version_no)}
                          >
                            <Button type="link" size="small">
                              回滚
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <Empty description="暂无版本记录" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={10}>
          <Card title="领导意见">
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Input.TextArea
                rows={3}
                placeholder="填写领导意见…"
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
              />
              <Space>
                <Input
                  style={{ width: 200 }}
                  placeholder="提交人"
                  value={feedbackAuthor}
                  onChange={(e) => setFeedbackAuthor(e.target.value)}
                />
                <Button type="primary" loading={submitting} onClick={handleFeedback}>
                  提交意见
                </Button>
              </Space>
            </Space>
            <div style={{ marginTop: 12 }}>
              {(detail.feedbacks ?? []).length ? (
                (detail.feedbacks ?? []).map((f) => {
                  const s = FEEDBACK_STATUS_META[f.status] ?? { label: f.status, color: 'default' };
                  return (
                    <Card size="small" key={f.id} style={{ marginBottom: 8 }}>
                      <Space wrap style={{ marginBottom: 4 }}>
                        <Typography.Text strong>{f.author || '匿名'}</Typography.Text>
                        <Tag color={s.color}>{s.label}</Tag>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {fmtTime(f.created_at)}
                        </Typography.Text>
                      </Space>
                      <div>{f.content}</div>
                    </Card>
                  );
                })
              ) : (
                <Empty description="暂无意见" />
              )}
            </div>
          </Card>

          <Card
            title={
              <Space>
                <span>AI 修改建议</span>
                {pendingCount > 0 && <Badge count={pendingCount} size="small" />}
              </Space>
            }
            style={{ marginTop: 16 }}
          >
            {(detail.suggestions ?? []).length ? (
              (() => {
                const sorted = [...(detail.suggestions ?? [])].sort((a, b) => {
                  const pa = isPendingSuggestion(a.status) ? 0 : 1;
                  const pb = isPendingSuggestion(b.status) ? 0 : 1;
                  if (pa !== pb) return pa - pb;
                  return (b.created_at ?? '').localeCompare(a.created_at ?? '');
                });
                return sorted.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    item={s}
                    onViewDiff={setDiffItem}
                    onConfirm={handleConfirmSuggestion}
                  />
                ));
              })()
            ) : (
              <Empty description="暂无 AI 建议" />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <span>
              {diffItem
                ? `方案修改对比 · ${TRIGGER_META[diffItem.trigger_type]?.label ?? diffItem.trigger_type} · ${fmtTime(diffItem.created_at)}`
                : '方案修改对比'}
            </span>
            <Segmented
              value={diffFormat}
              onChange={(v) => setDiffFormat(v as 'md' | 'text')}
              options={[
                { label: 'Markdown 渲染', value: 'md' },
                { label: '纯文本对比', value: 'text' },
              ]}
            />
          </Space>
        }
        open={!!diffItem}
        onCancel={() => { setDiffItem(null); setEditingDiff(false); }}
        width="96%"
        style={{ top: 24 }}
        footer={
          editingDiff ? (
            <Space>
              <Button onClick={() => setEditingDiff(false)}>取消编辑</Button>
              <Button type="primary" loading={savingDiffEdit} onClick={handleSaveDiffEdit}>
                保存修改
              </Button>
            </Space>
          ) : isPendingSuggestion(diffItem?.status) ? (
            <Space>
              <Button onClick={() => { setDiffEditText(diffItem.suggestion_md ?? ''); setEditingDiff(true); }}>
                编辑建议稿
              </Button>
              <Popconfirm title="确认采纳该建议？" onConfirm={() => { if (diffItem) handleConfirmSuggestion(diffItem.id, 'adopt'); setDiffItem(null); }}>
                <Button type="primary">采纳并生成新版本</Button>
              </Popconfirm>
              <Popconfirm title="确认驳回该建议？" onConfirm={() => { if (diffItem) handleConfirmSuggestion(diffItem.id, 'reject'); setDiffItem(null); }}>
                <Button danger>驳回</Button>
              </Popconfirm>
            </Space>
          ) : (
            <Button onClick={() => setDiffItem(null)}>关闭</Button>
          )
        }
      >
        {diffItem && editingDiff ? (
          <Input.TextArea
            value={diffEditText}
            onChange={(e) => setDiffEditText(e.target.value)}
            rows={26}
            className="plan-md-editor"
          />
        ) : diffItem && (
          (() => {
            const oldValue = diffItem.base_content_md || detail.content_md || '';
            const newValue = diffItem.suggestion_md ?? '';
            const noDiff = oldValue === newValue;
            if (noDiff) {
              return <Empty description="无差异：当前方案内容已与该建议一致（可能已采纳过）" />;
            }
            return diffFormat === 'md' ? (
              <PlanDiff
                oldValue={oldValue}
                newValue={newValue}
                leftTitle="建议生成时的方案（改动行红底 + 删除线）"
                rightTitle="AI 修改稿（改动行绿底高亮）"
              />
            ) : (
              <div style={{ border: '1px solid #e8e8e8', borderRadius: 4, height: '72vh', overflow: 'auto' }}>
                <ReactDiffViewer
                  oldValue={oldValue}
                  newValue={newValue}
                  splitView
                  hideLineNumbers={false}
                  leftTitle="建议生成时的方案（改动处红色删除线）"
                  rightTitle="AI 修改稿（改动处绿色加粗）"
                  styles={diffStyles}
                />
              </div>
            );
          })()
        )}
      </Modal>
    </div>
  );
}
