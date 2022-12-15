import React, { Fragment } from 'react';
import { Row, Col, InputGroup, Button, ToggleButton } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { Formik } from 'formik';
import { setLoggedState } from '../../AppSlice.js';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import cryptoJS from 'crypto-js'
import GetUrlProperties from '../../utils/urls.js';
import { setPasswordVisible } from './slice.js';
import renderHeader from '../Header/Header.js';

function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();  
  const {
    isPasswordVisible
  } = useSelector((state) => {
    console.log(`Login::render: state=${JSON.stringify(state.login)}`);
    return state.login;
  });

  const onSubmit = async (values, { resetForm, setStatus }) => {
    let res
    setStatus(undefined);
    var passwdHashed = cryptoJS.SHA1(values.password).toString(cryptoJS.enc.Hex);
    try {
      res = await axios({
        url: `http://${GetUrlProperties().hostname}:50001/api/auth`,
        method: 'post',
        data: { login: values.login, password: passwdHashed }
      })
    } catch(err) {
      console.log(`Login failed:. ${err}`)
      res = err.response
    }

    console.log(`Request result: ${JSON.stringify(res)}`);
    if (res.status !== 201 && res.status !== 200) {
      console.log(`Login failed, status = ${res.status}`);
      setStatus('Введенные данные неверны.');
      return;
    }

    window.localStorage.setItem('authInfo', JSON.stringify(res.data));
    dispatch(setLoggedState({ isLoggedIn: true }));
    resetForm();

    navigate('/');
  }

  const handlePasswordVisibilityChange = () => {
    console.log(`handlePasswordVisibilityChange: ${isPasswordVisible}`)
    dispatch(setPasswordVisible({isPasswordVisible: !isPasswordVisible}))
  }

  return (
    <Fragment>
      {renderHeader(dispatch, {isLoggedIn: false})}
      <Row>
        <Col xs={2} sm={2} md={3} lg={3} xl={4} xxl={4}></Col>
        <Col xs={8} sm={8} md={6} lg={6} xl={4} xxl={4}>
          <Formik
            initialValues={{ login: '', password: '' }}
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
                <Form className='p-5'>
                  <fieldset disabled={isSubmitting}>
                    <Form.Group className='mb-3' controlId='formBasicLogin'>
                      <Form.Label>Имя пользователя</Form.Label>
                      <Form.Control 
                        name="login" 
                        type="login" 
                        placeholder='Введите имя пользователя' 
                        onChange={handleChange}
                        onBlur={handleBlur}
                        value={values.login} />
                      <Form.Text className='text-muted'>Введите имя пользователя</Form.Text>
                    </Form.Group>
                    <Form.Group className='mb-3' controlId='formBasicPassword'>
                      <Form.Label>Пароль</Form.Label>
                      <InputGroup>
                        <Form.Control 
                          name="password" 
                          type={isPasswordVisible ? "login" : "password"} 
                          placeholder='Введите пароль' 
                          onChange={handleChange}
                          onBlur={handleBlur}
                          value={values.password}/>
                        <ToggleButton
                          type='checkbox' 
                          variant='secondary'
                          value={isPasswordVisible} 
                          onClick={handlePasswordVisibilityChange}>
                          <i className={`bi ${isPasswordVisible ? "bi-eye-slash" : "bi-eye"}`}/>
                        </ToggleButton>
                      </InputGroup>
                      <Form.Text className='text-muted'>Введите пароль</Form.Text>
                      { status ? <div style={{color: 'red'}}>{status}</div> : <div style={{color: 'red'}}>{errors.password}</div> }
                    </Form.Group>
                    <Button
                      className='d-flex justify-content-center' 
                      variant="primary" 
                      type="submit"
                      disabled={isSubmitting} 
                      onClick={handleSubmit}>
                        <div className='d-flex align-items-center'>
                          <div className='p-1'>OK</div>
                            { isSubmitting &&
                              <span className="spinner-border spinner-border-md" role="status" aria-hidden="true"></span> }                
                        </div>
                    </Button>
                    </fieldset>
                </Form>
              )}
          </Formik>
        </Col>
        <Col></Col>
      </Row>
    </Fragment>
  );
}

export default Login;