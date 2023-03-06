import React, { useState } from 'react'
import './TaskList.scss'
import { Table, Form, Input, Button, Modal } from 'antd'

const CollectionCreateForm = ({ visible, onCreate, onCancel }) => {
  const [form] = Form.useForm()
  const formItemLayout = {
    labelCol: { span: 4 },
  }
  return (
    <Modal
      visible={visible}
      title="连接"
      onCancel={onCancel}
      okText="确定"
      cancelText="取消"
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            form.resetFields()
            onCreate(values)
          })
          .catch(info => {})
      }}
    >
      <Form {...formItemLayout} form={form} name="basic" initialValues={{ remember: true }}>
        <Form.Item label="地址" name="address" rules={[{ required: true, message: '请输入地址' }]}>
          <Input placeholder="请输入地址" />
        </Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input placeholder="请输入密码" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

const dataSource = [
  {
    id: 1,
    key: '1',
    user: '张三',
    time: '2012-12-12',
    content: '删除列表一',
    mmark: '',
  },
  {
    id: 2,
    key: '2',
    user: '李四',
    time: '2012-12-12',
    content: '删除列表二',
    mmark: '',
  },
  {
    id: 3,
    key: '3',
    user: '王五',
    time: '2012-12-12',
    content: '删除列表三',
    mmark: '',
  },
]

const columns = [
  {
    title: '操作人员',
    dataIndex: 'user',
    key: 'user',
  },
  {
    title: '操作时间',
    dataIndex: 'time',
    key: 'time',
  },
  {
    title: '操作内容',
    dataIndex: 'content',
    key: 'content',
  },
  {
    title: '备注',
    dataIndex: 'mmark',
    key: 'mmark',
  },
]

const TaskList = () => {
  const [visible, setVisible] = useState(false)
  const onCreate = values => {
    console.log(values)
    setVisible(false)
  }

  const open = () => {
    setVisible(true)
  }

  return (
    <>
      <div className="task-header">
        <Button onClick={open} type="primary">
          连接
        </Button>
      </div>
      <div className="task-list-container">
        <Table dataSource={dataSource} columns={columns} />
      </div>
      <CollectionCreateForm
        visible={visible}
        onCreate={onCreate}
        onCancel={() => {
          setVisible(false)
        }}
      />
    </>
  )
}

export default TaskList
