import React, { Fragment } from 'react';
import { Table, Collapse, Button, Row, Col, Badge, OverlayTrigger, Tooltip, ButtonGroup, ToggleButton } from 'react-bootstrap';
import axios from 'axios';
import GetUrlProperties from '../../utils/urls';
import { dateAddDays, dateToYYYYMMDDString, dateToDDMMYYYYHHMMSSString, timestampToUnixTime } from '../../utils/date';
import DatepickerComponent from '../../utils/DatePickerComponent';
import { 
    setFiltersOpen,
    setSelectedSensors,
    setSelectedComplexes, 
    setFiltersDiapazone,
    setSelectedDataType,
    setIsFirstTimeLoading } from '../../AppSlice'
import ReactEcharts from 'echarts-for-react';
// import { date } from 'yup';
    
const timestampSorter = (a, b) => { 
    if(a.timestamp > b.timestamp) {
        return -1;
    }
    if(a.timestamp < b.timestamp) {
        return 1;
    }
    return 0;
    }

export const updateSensorsData = async (token, from, to, callback, unauthorizedCallback) => {
    // console.log(`SensorsData::RenderSensorsData::updateSensorsData(${from}, ${to})`)
    let fromTimestamp = Date.parse(from)/1000
    let toTimestamp = Date.parse(to)/1000 + 24*60*60
    var res;
    try {
        res = await axios({
        url: `http://${GetUrlProperties().hostname}:50001/api/sensors/data?from=${fromTimestamp}&to=${toTimestamp}`,
        method: 'get',
        headers: {'Authorization': `Bearer ${token}`}
        })
    } catch(err) {
        console.log(`SensorsData::RenderSensorsData::updateSensorsData: Failed to request sensors data: ${JSON.stringify(err.response.status)}, code: ${JSON.stringify(err.response)}`)
        if (err.response.status === 401) {
        unauthorizedCallback()
        }
        return;
    }  
    const rawData = res.data.Data
    // console.log(`SensorsData::RenderSensorsData::updateSensorsData: Sensors data request result: ${JSON.stringify(rawData)}`)
    const result = rawData.map((it) => {
        return {
            complexId: it.ComplexID,
            // complexName: `Complex ${it.ComplexID}`,
            sensorId: it.Type,
            sensorName: it.Type,
            value: it.Value,
            timestamp: it.Timestamp}
    }).sort(timestampSorter)
    // console.log(`SensorsData::RenderSensorsData::updateSensorsData: Sensors data request result (size): ${result.length}`)
    callback(result);
}

export const RenderSensorsData = (state, dispatch) => {
    var data = []
    if (state.haveSensorsData) {
        const rawData = window.localStorage.getItem('SensorsData')
        data = JSON.parse(rawData)
    }

    var complexesMap = new Map()
    if (state.haveComplexesConfigInfo) {
        const rawData = window.localStorage.getItem('complexesConf')
        const data = JSON.parse(rawData)
        data.forEach((it) => {
            complexesMap[it.id] = it.name
        })
    }

    // const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    //     .map((item) => {
    //         return {
    //             complexId: item,
    //             complexName: `Complex ${item}`,
    //             sensorId: item,
    //             sensorName: `Sensor ${item}`,
    //             value: Math.random(),
    //             timestamp: Math.round(new Date() / 1000) - Math.round(Math.random() * 40 * 24 * 60 * 60)
    //         }
    //     })

    // console.log(`SensorsData::RenderSensorsData: Data: ${JSON.stringify(data)}`)

    const complexes = [{id: '0', name: 'Все'}].concat(Array.from(new Set(new Map(data.map((item) => [
        item.complexId,
        {id: `${item.complexId}`, name: complexesMap[item.complexId]},
    ])).values())))

    const sensors = [{id: '0', name: 'Все'}].concat(Array.from(new Set(new Map(data.map((item) => [
        item.sensorId,
        { id: item.sensorId, name: item.sensorName},
    ])).values())))
    // console.log(`SensorsData::RenderSensorsData::updateSensorsData: Selected complexes: ${JSON.stringify(state.selectedComplexes)}`)

    const removeFromArray = (arr, item) => {
        return arr.filter((val, _) => val !== item)
    }

    const toggleSelectedBadge = (id, selected) => {
        if (selected.includes(id)) {
            if (selected.length === 1) {
                return {
                    selected: ['0'],
                    isSelected: false,
                }
            } else {
                return { 
                    selected: removeFromArray(selected, id),
                    isSelected: false,
                }
            }
        }
        else {
            return {
                selected: selected.concat([id]),
                isSelected: true,
            }
        }
    }

    const onBadgeClicked = (id, selected, setSelected) => {
        // console.log(`SensorsData::onBadgeClicked(${id}) enter: ${selected}`)
        const newItemState = toggleSelectedBadge(id, selected)
        if (newItemState.isSelected && id === '0') {
            dispatch(setSelected({selected: ['0']}))
        } else if (!newItemState.isSelected && id !== '0') {
            dispatch(setSelected({selected: newItemState.selected}))
        } else {
            dispatch(setSelected({selected: removeFromArray(newItemState.selected, '0')}))
        } 
        // console.log(`SensorsData::onBadgeClicked(${id}) exit: ${selected}`)
    }

    const onComplexBadgeClicked = (complexId) => {
        onBadgeClicked(complexId, state.selectedComplexes, setSelectedComplexes)
    }

    const onSensorBadgeClicked = (sensorId) => {
        onBadgeClicked(sensorId, state.selectedSensors, setSelectedSensors)
    }

    const showBadges = (items, selected, clickListener, background = 'primary', keyPrefix='') => {
        return (
        items.map((item) => {
            return (
                <Badge 
                    key={`${keyPrefix}-${item.id}`}
                    pill
                    bg={selected.includes(item.id) ? background : 'secondary'}
                    onClick={() => { clickListener(item.id) }}
                    className='m-1'>
                        <strong>{item.name}</strong>
                </Badge>
            )
        }))
    }

    const showComplexSelection = (complexes) => {
        return (
            <div key='complexSelection' className='border mt-2 mb-2 p-2'>
                <small className='m-1'>Выберите комплекс(ы):</small>
                <br/>
                { showBadges(complexes, state.selectedComplexes, onComplexBadgeClicked, 'primary', 'complex') }
            </div>)
    }

    const showSensorsSelection = (sensors) => {
        return (
            <div key='sensorsSelection' className='border mt-2 mb-2 p-2'>
                <small className='m-1'>Выберите сенсор(ы):</small>
                <br/>
                { showBadges(sensors, state.selectedSensors, onSensorBadgeClicked, 'info', 'sensor') }
            </div>)
    }

    const onUpdatePeriod = () => {
        // console.log(`renderSensorsdata::onUpdatePeriod: ${JSON.stringify(state.filtersDiapazone)}`)
        dispatch(setIsFirstTimeLoading({ isFirstTimeLoading: true, updateTimestamp: Math.floor(Date.now() / 1000) }))
    }

    const showPeriodSelection = () => {
        // console.log(`SensorsData::showPeriodSelection ENTER: dates:(${state.filtersDiapazone.start}, ${state.filtersDiapazone.end})`)
        return (
            <div key='periodsSelection' className='border mt-2 mb-2 p-2'>
                <small className='m-1'>Выберите период для данных:</small>
                <br/>
                <div key='periodsSelectionPickers' className='d-flex align-items-center'>
                    <small className='m-1'>с</small>
                    <DatepickerComponent 
                        id='startDate'
                        name='startDate'
                        max={state.filtersDiapazone.end}
                        selectedValue={state.filtersDiapazone.start} 
                        onChange={(e) => { 
                            dispatch(setFiltersDiapazone({ filtersDiapazone: {start: e.target.value, end: state.filtersDiapazone.end} }))
                        }}
                    />
                    <small className='m-1 ms-5'>по</small>
                    <DatepickerComponent 
                        id='endDate'
                        name='endDate'
                        max={new Date().toISOString().split('T')[0]}
                        selectedValue={state.filtersDiapazone.end} 
                        onChange={(e) => { 
                            const newDate = Date.parse(e.target.value)
                            const startDate = Date.parse(state.filtersDiapazone.start)
                            var newStart = state.filtersDiapazone.start
                            if (newDate < startDate) {
                                const date = dateAddDays(newDate, -1)
                                newStart = dateToYYYYMMDDString(date)
                            }
                            dispatch(setFiltersDiapazone({ filtersDiapazone: {start: newStart, end: e.target.value} }))
                        }}/>
                    <OverlayTrigger
                        overlay={
                            <Tooltip id={`tooltipDiapazoneUpdate`}>
                               Нажмите для обновления в соответствии с диапазоном
                            </Tooltip>}>
                        <Button className='ms-5' variant="outline-primary" onClick={onUpdatePeriod}>
                            <i className="bi bi-arrow-repeat"></i>
                        </Button>
                    </OverlayTrigger>
                </div>
            </div>
        )
    }

    const renderFilters = (complexes, sensors) => {
        return (
            <Fragment>
                <Row key='filters'>
                    <Col>
                        <Collapse in={state.filtersOpen}>
                            <div>
                                <strong>Фильтры:</strong>
                                { showComplexSelection(complexes) }
                                { showSensorsSelection(sensors) }
                                { showPeriodSelection() }
                            </div>
                        </Collapse>
                    </Col>
                    <Col xs='1' sm='1' md='1' lg='1' xl='1' xxl='1'>
                        <Button 
                            type='checkbox'
                            variant='outline-secondary'
                            onClick={() => dispatch(setFiltersOpen({ filtersOpen: !state.filtersOpen }))}>
                                <i className="bi bi-funnel"/>
                        </Button>
                    </Col>
                </Row>
            </Fragment>)
    }

  // console.log(`::renderSensorsData ${JSON.stringify(state)}`)

    const filterComplexBy = (it, selected) => selected.some((someIt) => '0' === someIt) || selected.some((someIt) => it === someIt)
    const filteredData = data.filter((it) => 
        filterComplexBy(`${it.complexId}`, state.selectedComplexes) 
        && filterComplexBy(it.sensorId, state.selectedSensors))

    var sortedData = { complexes: [] } 

    const getOptions = (complex) => {
        const res = {
            responsive: true, // Instruct chart js to respond nicely.
            maintainAspectRatio: false,
            title: { 
                text: complexesMap[complex],
                left: 'center'
            },
            legend: {
                orient: 'horizontal',
                bottom: '10'
            },
            tooltip: {
                trigger: 'axis'
            },
            scales: {
                xAxes: [{
                    ticks: {
                        fontSize: 10
                    }
                }]
            },
            xAxis: {
                type: 'time',
                // axisLabel: {
                //     formatter: function (value, idx) {
                //         console.log(`xAxis::Formatter: ${value}`)

                //         return value; 
                //     }
                // }
                // name: 'дни (в прошлом)',
                // nameLocation: 'bottom',
            },
            yAxis: {
                type: 'value'
            },
            series: sortedData[complex].sensors.map((it) => {
                return {
                    name: it,
                    data: sortedData[complex][it],
                    type: 'line',
                    smooth: true
                }
            })
        }
        // console.log(`SensorsData::getOptions(${complex}): ${JSON.stringify(res.series)}`)
        return res
    }

    const renderGpaphs = (data) => {
        if (data.length === 0)
            return null
        const currentTimestamp = Math.floor(new Date().getTime() / 1000)
        // const sortedData = { complexes: [] }
        // console.log(`Data: ${JSON.stringify(data)}`)
        // const valueConverterToDaysPast = (value, currentTimestamp) => (value - currentTimestamp)/60/60/24
        // const valueConverterOff = (value, currentTimestamp) => value - currentTimestamp
        const valueConverterDate = (value, currentTimestamp) => {
            return timestampToUnixTime(value)
        }

        data.forEach((value) => {
            if (!(value.complexId in sortedData)) {
                sortedData.complexes.push(value.complexId)
                sortedData[value.complexId] = { sensors: []}
            }
            if (!(value.sensorId in sortedData[value.complexId])) {
                sortedData[value.complexId].sensors.push(value.sensorId)
                sortedData[value.complexId][value.sensorId] = []
            }
            sortedData[value.complexId][value.sensorId].push([valueConverterDate(value.timestamp, currentTimestamp), value.value])
        })
        // console.log(`Sorted data: ${JSON.stringify(sortedData)}`)
        return (
            sortedData.complexes.map(complex => {
                return (
                    <div key={complex}>
                        <ReactEcharts
                            notMerge = { true }
                            lazyUpdate = { true }
                            option={ getOptions(complex) }
                        />
                    </div>)
            })
        )
    }

    const renderTable = (filteredData) => {
        for (var i = 0; i < filteredData.length; ++i) {
            const item = filteredData[i]
            item.direction = ""
            for (var j = i + 1; j < filteredData.length; ++j) {
                const eItem = filteredData[j]
                if (item.complexId === eItem.complexId && item.sensorName === eItem.sensorName) {
                    if (item.value < eItem.value)
                        item.direction = '-';
                    else if (item.value > eItem.value)
                        item.direction = '+';
                    break;
                }
            }
        }
        // console.log(`SensorsData::renderTable: ${JSON.stringify(filteredData)}`)

        const renderValueItem = (sensorItem, index) => {
            var sign = <i className="bi bi-dot"></i>;
            switch(sensorItem.direction) {
                case '+': 
                    sign = <i style={{color: 'green', width: 150}} className='bi bi-arrow-up'></i>
                    break;
                case '-':
                    sign = <i style={{color: 'red', width: 150}}  className='bi bi-arrow-down'></i>
                    break;
                default:
            }
            return (
                <Row key={`value-${index}`} xs='auto'>
                    <Col>{ sign }</Col>
                    <Col>{ sensorItem.value }</Col>
                </Row>
            )
        }

        return (
            <Table striped hover>
                <thead>
                    <tr key='header'>
                        <th className='col-xs-2 col-sm-2 col-md-2 col-lg-2 col-xl-2 col-xxl-2'>Комплекс</th>
                        <th>Тип сенсора</th>
                        <th>Значение</th>
                        <th className='col-xs-3 col-sm-3 col-md-3 col-lg-3 col-xl-3 col-xxl-3'>Дата</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        filteredData.map((sensorItem, index) => {
                            return (
                                <tr key={index}>
                                    <td>{complexesMap[sensorItem.complexId]}</td>
                                    <td>{sensorItem.sensorName}</td>
                                    <td>{renderValueItem(sensorItem, index)}</td>
                                    <td>{dateToDDMMYYYYHHMMSSString(sensorItem.timestamp)}</td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </Table>)
    }

    return (
        <Fragment>
            { renderFilters(complexes, sensors) }
            <ButtonGroup className='pt-3 pb-5'>
                <ToggleButton
                    key='tab'
                    id='radio-tab'
                    value='tab'
                    checked={state.selectedDataType === 'tab'}
                    onChange={(e) => dispatch(setSelectedDataType({ selectedDataType: e.currentTarget.value }))}
                    type='radio'>
                    Таблица
                </ToggleButton>
                <ToggleButton
                    key='graph'
                    type='radio'
                    value='graph'
                    checked={state.selectedDataType === 'graph'}
                    onChange={(e) => dispatch(setSelectedDataType({ selectedDataType: e.currentTarget.value }))}
                    id='radio-graph'>
                    Графики
                </ToggleButton>
            </ButtonGroup>
            { (state.selectedDataType === 'tab') ? renderTable(filteredData) : renderGpaphs(filteredData) }
        </Fragment>)
  }
