import IndexComponent from '../components/index'
import Viewer from '../pages/Viewer/Viewer'
import StudyList from '../pages/StudyList/StudyList'
import TaskList from '../pages/TaskList/TaskList'
import { Redirect } from 'react-router-dom'

const routes = [
  {
    path: '/',
    component: IndexComponent,
    routes: [
      {
        path: '/studyList',
        component: StudyList,
        routes: [],
        render: () => <Redirect to={'/viewer/1'} />,
      },
      {
        path: '/taskList',
        component: TaskList,
        routes: [],
        render: () => <Redirect to={'/viewer/1'} />,
      },
      {
        path: '/viewer/:studyInstanceUids',
        component: Viewer,
        routes: [],
      },
    ],
  },
]

export default routes
