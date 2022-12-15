import React, { Fragment, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.css';
import { setLoggedState, 
    setComplexesInfo, 
    setUsersInfo, 
    setComplexesConfigInfo, 
    setIsFirstTimeLoading,
    setNeedToChangePassword, 
    setHaveSensorsData,
    showDialog} from './AppSlice';
import { renderComplexes, updateComplexes } from './features/Complexes/Complexes';
import renderComplexesConfig from './features/ComplexesConfig/ComplexesConfig';
import { renderUsers, updateUsers } from './features/Users/Users';
import * as yup from 'yup';
import { Formik } from 'formik';
import { 
  Container, Tab, Tabs, Button, Modal,
  Form, FormGroup, FormLabel, FormControl,
  InputGroup, ToggleButton, Row, Col } from 'react-bootstrap';
import cryptoJS from 'crypto-js'
import axios from 'axios';
import GetUrlProperties from './utils/urls';
import { RenderSensorsData, updateSensorsData } from './features/SensorsData/SensorsData';
import renderHeader from './features/Header/Header';

var intervalGeneratorId = null;

function App() {
//   console.log(`Page address: ${window.location.href}`)

  const navigate = useNavigate();
  const dispatch = useDispatch();  
  const state = useSelector((state) => {
    // console.log(`App::render: state=${JSON.stringify(state.app)}`);
    return state.app;
  });
  // console.log(`App::render: state=${JSON.stringify(state)}`);

  if (!state.isLoggedIn && intervalGeneratorId) {
    clearInterval(intervalGeneratorId);
    intervalGeneratorId = null;
  }

  const authInfoString = window.localStorage.getItem('authInfo');
  const authInfo = JSON.parse(authInfoString)
  // console.log(`App::render: authInfo=${JSON.stringify(authInfo)}`);

  useEffect(() => {
    if (authInfo === null) {
      navigate('/login');
    }
  }, [authInfo, navigate])

  if (authInfo === null) {
    dispatch(setLoggedState({ isLoggedIn: false }));
    return null;
  } else if (!state.isLoggedIn) {
    dispatch(setLoggedState({ isLoggedIn: true }));
  }

  const updateComplexesCallback = (key, complexes) => {
    // console.log(`::updateComplexesCallback ${key} -> ${complexes.length}`)
    switch(key) {
      case 'info':
        window.localStorage.setItem('complexesInfo', JSON.stringify(complexes))
        dispatch(setComplexesInfo({ haveComplexesInfo: true }))
        break;
      case 'conf':
        window.localStorage.setItem('complexesConf', JSON.stringify(complexes))
        dispatch(setComplexesConfigInfo({ haveComplexesConfigInfo: true }))
        if (authInfo.Role.toLowerCase !== 'admin') {
          dispatch(setIsFirstTimeLoading({ isFirstTimeLoading: false, updateTimestamp: Date.now() }))
        }
        break;
      default:
    }
  }

const updateUsersCallback = (users) => {
    // console.log(`app::updateUsersCallback users: ${JSON.stringify(users)}`);
    window.localStorage.setItem('users', JSON.stringify(users))
    dispatch(setUsersInfo({ haveUsersInfo: true }))
    dispatch(setIsFirstTimeLoading({ isFirstTimeLoading: false, updateTimestamp: Date.now() }))
}

const updateSensorsDataCallback = (data) => {
    window.localStorage.setItem('SensorsData', JSON.stringify(data))
    dispatch(setIsFirstTimeLoading({ isFirstTimeLoading: false, updateTimestamp: Date.now() }))
    dispatch(setHaveSensorsData({ haveSensorsData: true }))
}

const unauthorizedCallback = () => {
    window.localStorage.removeItem('authInfo');
    dispatch(setLoggedState({ isLoggedIn: false }))
  }

const updateData = (authInfo) => {
    // console.log(`Updating complexes info: isFirstTime=${state.isFirstTimeLoading}, haveComplexes=${state.haveComplexesInfo}, haveComplexesConfig=${state.haveComplexesConfigInfo}, haveUsersInfo=${state.haveUsersInfo}, haveSensorsData=${state.haveSensorsData}, isLoggedIn=${state.isLoggedIn}`)
    switch(authInfo.Role.toLowerCase()) {
      case 'admin':
        updateComplexes(authInfo.TokenInfo.Token, updateComplexesCallback, unauthorizedCallback)
        updateUsers(authInfo.TokenInfo.Token, updateUsersCallback, unauthorizedCallback)
        updateSensorsData(authInfo.TokenInfo.Token, state.filtersDiapazone.start, state.filtersDiapazone.end, updateSensorsDataCallback, unauthorizedCallback)
        break;
      case 'service':
        updateComplexes(authInfo.TokenInfo.Token, updateComplexesCallback, unauthorizedCallback)
        updateSensorsData(authInfo.TokenInfo.Token, state.filtersDiapazone.start, state.filtersDiapazone.end, updateSensorsDataCallback, unauthorizedCallback)
        break;
      case 'user':
        updateComplexes(authInfo.TokenInfo.Token, updateComplexesCallback, unauthorizedCallback)
        break;
      default:
    }
  }

  if (state.isFirstTimeLoading && state.isLoggedIn && authInfo.ChangePassword) {
    dispatch(setNeedToChangePassword({ needToChangePassword: true }))
  }

  if (state.isFirstTimeLoading && state.isLoggedIn) {
    updateData(authInfo)
    if (intervalGeneratorId !== null) {
      clearInterval(intervalGeneratorId)
    }
    intervalGeneratorId = setInterval(() => {
      // console.log(`Updating page: ${new Date()}`)
      updateData(authInfo)
    }, 10000)
  }

  const renderChangePassword = (state, userId) => {
    const validationSchema = yup.object().shape({
      password: yup.string()
          .min(5, 'Пароль должен быть минимум пять символов длинной и не более 20ти симоволов')
          .max(20, 'Пароль должен быть минимум пять символов длинной и не более 20ти симоволов')
          .required(),
      password2: yup.string()
          .min(5, 'Пароль должен быть минимум пять символов длинной и не более 20ти симоволов')
          .max(20, 'Пароль должен быть минимум пять символов длинной и не более 20ти симоволов')
          .required(),
    });

    const onSubmit = async (values, { resetForm, setStatus }) => {
      const updatePasswordRequest = async (values, state) => {
          let password = cryptoJS.SHA1(values.password).toString(cryptoJS.enc.Hex)
          let res;
          try {
              res = await axios({
                  url: `http://${GetUrlProperties().hostname}:50001/api/users/${userId}/changePassword`,
                  method: 'post',
                  data: { password: password },
                  headers: {'Authorization': `Bearer ${authInfo.TokenInfo.Token}`}
              })
          } catch(err) {
              console.log(`app::renderChangePassword::onSubmit::updatePasswordRequest: Failed to add user info: ${err}`)
              res = err.response
          }    
          return res;
        }

        console.log(`app::renderChangePassword::onSubmit: values = ${JSON.stringify(values)}`);
        if (values.password !== values.password2) {
            setStatus('Пароли должны совпадать.');
            return;
        }

        setStatus(undefined);
        
        let res = await updatePasswordRequest(values, state);
        // console.log('users::renderEditUserModal::onSubmit: after request')
        console.log(`app::renderChangePassword::onSubmit: Request result: ${JSON.stringify(res)}`);
        if (res.status === 401) {
          unauthorizedCallback()
          return;
        } else if (res.status !== 201 && res.status !== 200) {
            console.log(`app::renderChangePassword::onSubmit: Failed to add user info, status = ${res.status}`);
            setStatus('Неудачная попытка для добавления/обновления пользователя. Проверьте вводимые параметры.');
            return;
        }

        // await new Promise(resolve => setTimeout(resolve, 3000))
        resetForm();
        dispatch(setNeedToChangePassword({ needToChangePassword: false }))
    }

    var data = { password: '', password2: ''}

    return (<Modal 
        show={state.needToChangePassword}>
        <Modal.Header>Вам нужно сменить пароль</Modal.Header>
        <Modal.Body>
            <Formik
                initialValues={data}
                validationSchema={ validationSchema }
                onSubmit={onSubmit}>
                {({
                    values,
                    errors,
                    status,
                    touched,
                    handleChange,
                    handleBlur,
                    handleSubmit,
                    isSubmitting,
                }) => (
                <Form>
                  <FormGroup controlId="passGroup">
                    <FormLabel>Пароль</FormLabel>
                    <InputGroup>
                        <FormControl
                            name='password'
                            type={values.showPassword ? 'text' : 'password'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.password}
                            isInvalid={touched.name && errors.password}/>
                        <ToggleButton
                            type='checkbox' 
                            variant='secondary'
                            value={values.showPassword} 
                            onClick={() => {
                                // console.log(`Users::renderEditUserModal::onClick: values = ${JSON.stringify(values)}`)
                                handleChange({ target: { name: 'showPassword', value: !values.showPassword }}); } }>
                            <i className={`bi ${values.showPassword ? "bi-eye-slash" : "bi-eye"}`}/>
                        </ToggleButton>
                    </InputGroup>
                    <div style={{ color: 'red' }}>{errors.password}</div>
                  </FormGroup>
                  <br/>
                  <FormGroup controlId="pass2Group">
                    <FormLabel>Имя пользователя</FormLabel>
                    <InputGroup>
                        <FormControl
                            name='password2'
                            type={values.showPassword2 ? 'text' : 'password'}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            value={values.password2}
                            isInvalid={touched.name && errors.password2 && status}/>
                        <ToggleButton
                            type='checkbox' 
                            variant='secondary'
                            value={values.showPassword} 
                            onClick={() => {
                                // console.log(`Users::renderEditUserModal::onClick: values = ${JSON.stringify(values)}`)
                                handleChange({ target: { name: 'showPassword2', value: !values.showPassword2 }}); } }>
                            <i className={`bi ${values.showPassword2 ? "bi-eye-slash" : "bi-eye"}`}/>
                        </ToggleButton>
                    </InputGroup>
                    { status ? <div style={{color: 'red'}}>{status}</div> : <div style={{color: 'red'}}>{errors.password}</div> }
                  </FormGroup>
                  <br/>
                    <Button 
                        className='d-flex justify-content-center'
                        variant="outline-success" 
                        type="submit" 
                        disabled={isSubmitting} onClick={handleSubmit}>
                        <div className='p-1'>Подтвердить</div>
                        { isSubmitting &&
                            <span 
                                className="spinner-border spinner-border-md" 
                                role="status" 
                                aria-hidden="true"></span> }                
                    </Button>
                </Form>)}
            </Formik>
        </Modal.Body>
    </Modal>)
  }

  const renderTabs = (role) => {
    const tabsInfo = {
      admin: [{
          id: 'complexes',
          name: 'Комплексы',
          render: (state, dispatch) => { return renderComplexes(state, dispatch, authInfo.TokenInfo.Token) }
        }, {
          id: 'complexesConf',
          name: 'Конфигурация комплексов',
          render: (state, dispatch) => { return renderComplexesConfig(state, dispatch, authInfo.TokenInfo.Token) }
        }, {
          id: 'users',
          name: 'Управление пользователями и доступом',
          render: (state, dispatch) => { return renderUsers(state, dispatch, authInfo.TokenInfo.Token) }
        }, {
          id: 'sensorsData',
          name: 'Данные',
          render: (state, dispatch) => { return RenderSensorsData(state, dispatch, authInfo.TokenInfo.Token) }
        }
      ],
      user: [{
        id: 'complexes',
        name: 'Комплексы',
        render: (state, dispatch) => { return renderComplexes(state, dispatch, authInfo.TokenInfo.Token) }
      }],
      service: [{
        id: 'complexes',
        name: 'Комплексы',
        render: (state, dispatch) => { return renderComplexes(state, dispatch, authInfo.TokenInfo.Token) }
      }, {
        id: 'complexesConf',
        name: 'Конфигурация комплексов',
        render: (state, dispatch) => { return renderComplexesConfig(state, dispatch, authInfo.TokenInfo.Token) }
      }, {
        id: 'sensorsData',
        name: 'Данные',
        render: (state, dispatch) => { return RenderSensorsData(state, dispatch, authInfo.TokenInfo.Token) }
      }]
    }

    // console.log(`::renderTabs role: ${role}`)

    return (
      <Tabs
        defaultActiveKey="complexes"
        id={`ApplicationPageFor${role}`}
        className="mb-3">
        { 
          tabsInfo[role].map(tab => {
            return (
              <Tab key={tab.id} eventKey={tab.id} title={tab.name}>
                { tab.render(state, dispatch) }
              </Tab>)
          })
        }
      </Tabs>
    );
  }

  const renderDialog = (dialog, dispatch) => {
    if (!dialog)
      return null;

    const handleButtonClick = () => {
      dispatch(showDialog({ dialog: null }))
    }

    const renderType = (type) => {
      var iconClassName = null
      switch (type.toLowerCase()) {
        case "success": iconClassName = "bi bi-check2-circle"; break;
        case "error": iconClassName = "bi bi-patch-exclamation"; break;
        case "info": iconClassName = "bi bi-info-circle"; break;
        default: iconClassName = null
      }
      
      if (iconClassName)
        return (<i className={`${iconClassName}`} style={{fontSize: '30px'}}></i>);
      else 
        return null;
    }

    return (
      <Modal 
          onHide={handleButtonClick}
          centered 
          show={dialog}>
          {dialog.title && <Modal.Header>
              <Modal.Title>{dialog.title}</Modal.Title>
          </Modal.Header>}
          <Modal.Body>
              <Container>
                <Row>
                  <Col xs={2} md={2} lg={1} xl={1} xxl={1} className='d-flex justify-content-center'>{renderType(dialog.type)}</Col>
                  <Col className='d-flex align-items-center'>{dialog.message && <div>{dialog.message}</div>}</Col>
                </Row>
              </Container>
          </Modal.Body>
          {dialog.button && <Modal.Footer>
              <Button 
                  className='d-flex justify-content-center'
                  variant="outline-secondary" 
                  onClick={handleButtonClick}>
                  <div className='p-1'>{dialog.button}</div>
              </Button>
          </Modal.Footer>}
      </Modal>)
  }

  return (
    <Fragment>
      {renderHeader(dispatch, state)}
      <Container fluid>
        {renderTabs(authInfo.Role.toLowerCase())}
      </Container>
      {renderChangePassword(state, authInfo.ID)}
      {renderDialog(state.dialog, dispatch)}
    </Fragment>
  );
}

export default App;
