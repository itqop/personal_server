import React, { Fragment } from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import GetUrlProperties from '../../utils/urls';
import { timestampToSinceNowDateTimeStringApprox } from '../../utils/date';

const nameSorter = (a, b) => { 
  if(a.name < b.name) {
    return -1;
  }
  if(a.name > b.name) {
    return 1;
  }
  return 0;
}

const updateCompexesResultToComplexesStatConverter = (data) => {
  return data.map((complex) => {
    var state, text;
    let secondsFromLastData = Math.floor(new Date().getTime() / 1000) - complex.Statistic.LastDataReceiveTimestamp
    const possibleNoDataPeriodSeconds = 1 * 60;
    const possibleWarningPeriodSeconds = 3 * 60;
  //   console.log(`Seconds from last data: ${secondsFromLastData}, ${possibleNoDataPeriodSeconds}, ${possibleWarningPeriodSeconds}`)
    if (secondsFromLastData < possibleNoDataPeriodSeconds) {
      state = 'primary'; text = 'dark'
    } else if (secondsFromLastData >= possibleNoDataPeriodSeconds 
      && secondsFromLastData < possibleWarningPeriodSeconds) {
      state = 'warning'; text = 'dark'
    } else {
      state = 'danger'; text = 'dark'
    }
    // const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    // const date = new Date(complex.Statistic.LastDataReceiveTimestamp * 1000);
    const dateString = timestampToSinceNowDateTimeStringApprox(complex.Statistic.LastDataReceiveTimestamp)
    // const dateString = date.toLocaleDateString("ru-RU", dateOptions);
    // const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
    // const timeString = date.toLocaleTimeString("ru-RU", timeOptions);
    return {
      name: complex.Info.Name,
      lastData: complex.Statistic.LastDataReceiveTimestamp === 0 ? '-' : dateString,
      isConnected: `${complex.Statistic.IsConnected ? "Соединение" : "Нет соединения"}`,
      state: state,
      text: text
    }
  }).sort(nameSorter)
}

const updateCompexesResultToComplexesConfConverter = (data) => {
  return data.map((complex) => {
    return ({
      name: complex.Info.Name,
      id: complex.Info.ID,
      ip: complex.Info.Ip,
    });
  })
  .sort(nameSorter);
}

export const updateComplexes = async (token, callback, unauthorizedCallback) => {
    // console.log("api::updateComplexes [ENTER]")
    var res;
    try {
      res = await axios({
        url: `http://${GetUrlProperties().hostname}:50001/api/complexes`,
        method: 'get',
        headers: {'Authorization': `Bearer ${token}`}
      })
    } catch(err) {
      console.log(`Failed to request complexes info: ${JSON.stringify(err.response.status)}, code: ${JSON.stringify(err.response)}`)
      if (err.response.status === 401) {
        unauthorizedCallback()
      }
      return;
    }  
    // console.log(`Complexes request result: ${JSON.stringify(res)}`)

    callback('info', updateCompexesResultToComplexesStatConverter(res.data));
    callback('conf', updateCompexesResultToComplexesConfConverter(res.data));
  }

export const renderComplexes = (state, dispatch) => {
  // console.log(`::renderComplexes ${JSON.stringify(state)}`)
  if (!state.haveComplexesInfo) {
    return null;
  }

  let complexesInfo = window.localStorage.getItem('complexesInfo')
  const complexes = JSON.parse(complexesInfo)

  // console.log(`::renderComplexes ${JSON.stringify(complexes)}`)

  return (
    <Fragment>
      <div className='m-2'><small>{`Состояние на ${new Date().toLocaleString("ru", {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'})}`}</small></div>
      <Row className="row-cols-1 row-cols-xs-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-3 row-cols-xl-4 row-cols-xxl-5">
      { complexes.map(complex => {
        return (
          <Col key={complex.name} className='d-flex align-items-stretch'>
            <Card className='d-flex align-items-stretch m-2 w-100'
              border={complex.state}
              text={complex.text}
              key={complex.name}>
              <Card.Header as="h6">{complex.name}</Card.Header>
              <Card.Body>
                <div><small>Данные получены:</small></div>
                <div>{complex.lastData}</div>
                {/* <div>{complex.lastData.time}</div> */}
                {/* <div>{complex.isConnected}</div> */}
              </Card.Body>
            </Card>
          </Col>
        )
      })}
      </Row>
    </Fragment>)
  }
