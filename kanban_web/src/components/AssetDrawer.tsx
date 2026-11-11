import { useEffect, useState } from 'react'
import { App as AntdApp, Button, Drawer, Space, Table, Tag, Typography, Upload } from 'antd'
import type { TableColumnsType, UploadProps } from 'antd'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons'
import { assetApi } from '../api'
import type { ApiError, Asset } from '../types'

const { Text } = Typography

interface Props {
  open: boolean
  onClose: () => void
}

export default function AssetDrawer({ open, onClose }: Props) {
  const { message, modal } = AntdApp.useApp()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setAssets(await assetApi.list())
    } catch (e) {
      message.error((e as ApiError).message || '加载资源失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const f = options.file as unknown as { originFileObj?: File } & File
    const raw: File = f.originFileObj ?? f
    setUploading(true)
    try {
      await assetApi.upload(raw)
      message.success('上传成功')
      await load()
    } catch (e) {
      message.error((e as ApiError).message || '上传失败')
    } finally {
      setUploading(false)
      options.onSuccess?.({}, new XMLHttpRequest())
    }
  }

  const copyUrl = (a: Asset) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(a.url).then(() => message.success('已复制地址'))
    }
  }

  const remove = (a: Asset) => {
    modal.confirm({
      title: `删除「${a.name}」？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await assetApi.remove(a.id)
          message.success('已删除')
          await load()
        } catch (e) {
          message.error((e as ApiError).message || '删除失败')
        }
      },
    })
  }

  const columns: TableColumnsType<Asset> = [
    {
      title: '预览',
      width: 70,
      render: (_, r) =>
        r.type === 'image' ? (
          <img src={r.url} alt={r.name} style={{ width: 48, height: 48, objectFit: 'cover' }} />
        ) : (
          <Tag>{r.type}</Tag>
        ),
    },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    {
      title: '大小',
      dataIndex: 'size',
      width: 90,
      render: (s: number) => (s ? Math.round(s / 1024) + ' KB' : '—'),
    },
    {
      title: '操作',
      width: 120,
      render: (_, r) => (
        <Space size="small">
          <Button size="small" icon={<CopyOutlined />} onClick={() => copyUrl(r)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(r)} />
        </Space>
      ),
    },
  ]

  return (
    <Drawer title="资源管理" open={open} onClose={onClose} width={620} destroyOnHidden>
      <Upload
        accept="image/*,video/*,audio/*,.ttf,.otf,.woff,.woff2,.pdf"
        showUploadList={false}
        customRequest={customRequest}
      >
        <Button type="primary" loading={uploading}>
          上传文件
        </Button>
      </Upload>
      <Text type="secondary" style={{ display: 'block', margin: '8px 0 12px' }}>
        本地存储（./storage/{`{yyyy}/{mm}/{uuid}.{ext}`}），地址可复制用于组件。
      </Text>
      <Table<Asset>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={assets}
        pagination={false}
        columns={columns}
      />
    </Drawer>
  )
}
