import React, { Fragment } from 'react';
import { Row, Col, Figure, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { setLoggedState } from '../../AppSlice';

const renderHeader = (dispatch, state) => {

  // console.log(`Header::renderHeader(${JSON.stringify(state)})`)

  const isLoggedIn = state.isLoggedIn

  const onLogout = (dispatch) => {
    window.localStorage.removeItem('authInfo');
    window.localStorage.removeItem('complexesInfo');
    window.localStorage.removeItem('complexesConf');
    window.localStorage.removeItem('users');
    window.localStorage.removeItem('SensorsData')
    dispatch( setLoggedState( { isLoggedIn: false }) );
  }

  return (
    <Fragment>
      <Row className='p-2'>
        <Col xxs='2' xs = '2' lg = '3' md = '3' sm = '3' xl = '3' xxl = '3'>
            <Figure.Image
            alt="НИИР"
            src="https://www.niir.ru/wp-content/uploads/2022/06/лого.png"/>
        </Col>
        <Col xxs = '2' xs = '5' sm = '7' md = '7' lg = '7' xl = '7' xxl = '7' className='align-self-center'>
            <h4 className='d-flex justify-content-center'>Сервер накопления информации КАП</h4>
        </Col>
        <Col className='d-flex justify-content-center align-items-center'>
          { isLoggedIn && 
            <OverlayTrigger
              overlay={
                <Tooltip id={`tooltipLogount`}>
                   Нажмите для выхода
                </Tooltip>}>
              <Button 
                variant='outline-secondary' 
                className='d-flex justify-content-center align-items-center'
                onClick={() => { onLogout(dispatch) }}>
                <span className='bi bi-box-arrow-left'></span>
              </Button>
            </OverlayTrigger>}
        </Col>
      </Row>
    </Fragment>
  )
}

export default renderHeader;
