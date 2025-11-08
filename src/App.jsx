import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Login from './component/Login'
import Contact from './component/contact'
import Dashboard from './component/dashboard'
import './App.css'
import '@fortawesome/fontawesome-free/css/all.min.css';
import Home from './component/Home'
import Admin from './component/Admin'
function App() {
  return (
    <>
        
        <Router>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/login' element={<Login />} />
            <Route path='/contact' element={<Contact />} />
            <Route path='/dashboard' element={<Dashboard />} />
            <Route path='/admin-dashboard' element={<Admin/>} />
            
          </Routes>
        </Router>
         </>
  )
}

export default App
