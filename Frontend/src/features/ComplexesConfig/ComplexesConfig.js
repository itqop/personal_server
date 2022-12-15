import { Fragment } from 'react';
import { 
    Table, Button, ButtonGroup, Modal, OverlayTrigger, Tooltip,
    Form, FormGroup, FormLabel, FormControl, Spinner } from 'react-bootstrap';
import { 
    showModalToAcceptComplexDelete,
    setIsSubmitting,
    showModalToEditConfiguration,
    showModalToAcceptComplexDeleteError,
    setSelectedComplexIndex,
    resetToInitialState, 
    showModalToComplexSettings,
    setLoggedState,
    setHaveComplexSettingInfo,
    setComplexSettingsInfoRequestInProgress,
} from '../../AppSlice';
import * as yup from 'yup';
import { Formik } from 'formik';
import axios from 'axios';
import GetUrlProperties from '../../utils/urls.js';

const renderComplexesConfig = (state, dispatch, token) => {
    if (!state.haveComplexesConfigInfo) {
        return null;
    }

    let complexesInfo = window.localStorage.getItem('complexesConf')
    const complexes = JSON.parse(complexesInfo)

    const getComplexName = (id) => {
        let found = complexes.find((item) => item.id === id)
        if (typeof found === 'undefined')
            return `${id}`
        return found.name
    }
  
    const onEditClicked = (id) => {
        // console.log(`On edit complex config #${id} clicked`)
        dispatch(showModalToEditConfiguration({ showModalToEditConfiguration: true, complexIdToEdit: id }))
    }

    const onConfigClicked = (id) => {
        console.log(`On configuration complex #${id} clicked`)
        dispatch(showModalToComplexSettings({ showModalToComplexSettings: true, complexIdToSettings: id}))
    }

    const onDeleteClicked = (id) => {
        // console.log(`On delete complex config #${id} clicked`)
        dispatch(showModalToAcceptComplexDelete({ showModalToAcceptComplexDelete: true, complexIdToDelete: id }))
    }

    const renderDeleteConfigurationModal = (state) => {
        const deleteComplex = async (id) => {
            dispatch(setIsSubmitting({ isSubmitting: true }))
            var res;
            try {
                res = await axios({
                    url: `http://${GetUrlProperties().hostname}:50001/api/complexes/${id}`,
                    method: 'delete',
                    headers: {'Authorization': `Bearer ${token}`}
                })
            } catch(err) {
                console.log(`Failed to delete} complex info: ${err}`)
                res = err.response
            }
    
            console.log(`Request result: ${JSON.stringify(res)}`);
            if (res.status !== 201 && res.status !== 200) {
                console.log(`Failed to delete complex info, status = ${res.status}`);
                dispatch(showModalToAcceptComplexDeleteError({showModalToAcceptComplexDeleteError: "Ошибка удаления."}))
                return false;
            }
            // return new Promise(resolve => setTimeout(resolve, 3000))
            return true;
        }
    
        const handleDeleteDialogClose = () => {
            dispatch(showModalToAcceptComplexDelete({ showModalToAcceptComplexDelete: false }))
        }
    
        const handleDeleteDialogConfirm = (id) => {
            // console.log(`handleDialogConfirmDelete #${id}`)
            deleteComplex(id).then(result => {
                if (result) {
                    dispatch(showModalToAcceptComplexDelete({ showModalToAcceptComplexDelete: false, complexIdToDelete: 0 }))
                    dispatch(resetToInitialState({ isFirstTimeLoading: true }))
                }
                dispatch(setIsSubmitting({ isSubmitting: false }))
            })
        }
    
        return (
            <Modal show={state.showModalToAcceptComplexDelete} onHide={() => { console.log("on hide")} }>
                <Modal.Header>
                    <Modal.Title>Удаление конфигурации</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>{`Вы уверены что хотите удалить конфигурацию комплекса '${getComplexName(state.complexIdToDelete)}'?`}</div>
                    <div style={{ color: 'red' }}>{state.showModalToAcceptComplexDeleteError}</div>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        className='d-flex justify-content-center'
                        disabled={state.isSubmitting}
                        variant="outline-success" 
                        onClick={() => { handleDeleteDialogConfirm(state.complexIdToDelete) } }>
                        <div className='p-1'>Да</div>
                            { state.isSubmitting &&
                                <span className="spinner-border spinner-border-md" role="status" aria-hidden="true"></span> }                
                    </Button>
                    <Button 
                        className='d-flex justify-content-center'
                        disabled={state.isSubmitting}
                        variant="outline-secondary" 
                        onClick={handleDeleteDialogClose}>
                        <div className='p-1'>Отмена</div>
                    </Button>
                </Modal.Footer>
            </Modal>)
    }

    const handleNewConfigurationClick = () => {
        console.log('ComplexesConfig::handleNewConfigurationClick() ENTER')
        dispatch(showModalToEditConfiguration({ showModalToEditConfiguration: true, complexIdToEdit: 0 }))
    }

    const handleNewConfigurationHide = () => {
        console.log('ComplexesConfig::handleNewConfigurationHide() ENTER')
        dispatch(showModalToEditConfiguration({ showModalToEditConfiguration: false, complexIdToEdit: 0 }))
    }

    const renderEditConfigurationModal = (state) => {
        const validationSchema = yup.object().shape({
            id: yup.number()
                .min(1, 'Идентификатор комплекса должен состоять минимум из одной цифры и не равняться нулю')
                .max(99999, 'Идентификатор комплекса должен состоять не более чем из пяти цифер')
                .required('Идентификатор необходим'),
            name: yup.string()
                .min(3, 'Название комплекса должно быть больше 3х и меньше 80ти символов.')
                .max(80, 'Название комплекса должно быть больше 3х и меньше 80ти символов.')
                .required('Название необходимо'),
            ip: yup.string()
                .min(7, 'ip-адрес должен быть представлен в формате 192.168.12.123')
                .matches(/(^(\d{1,3}\.){3}(\d{1,3})$)/, { 
                    message: 'ip-адрес должен быть представлен в формате 192.168.12.123',
                    excludeEmptyString: true })
              .required('IP-адрес необходим'),
          });

        var complexInfo;
        if (state.complexIdToEdit > 0)
            complexInfo = complexes.find((item) => item.id === state.complexIdToEdit);
        else
            complexInfo = { id: state.complexIdToEdit, name: '', ip: ''}
        // console.log(`ComplexesConfig::renderEditConfiguration complexInfo=${JSON.stringify(complexInfo)}`)

        const onSubmit = async (values, { resetForm, setStatus }) => {
            console.log(`ComplexesConfig::onSubmit: values = ${JSON.stringify(values)}`);
            setStatus(undefined);

            let method = state.complexIdToEdit === 0 ? 'put' : 'post';
            let sourceId = state.complexIdToEdit === 0 ? values.id : state.complexIdToEdit;
            let res;
            try {
                res = await axios({
                    url: `http://${GetUrlProperties().hostname}:50001/api/complexes/${sourceId}`,
                    method: method,
                    data: { id: parseInt(values.id, 10), ip: values.ip, name: values.name },
                    headers: {'Authorization': `Bearer ${token}`}
                })
            } catch(err) {
                console.log(`Failed to ${method} complex info: ${err}`)
                res = err.response
            }

            console.log(`Request result: ${JSON.stringify(res)}`);
            if (res.status !== 201 && res.status !== 200) {
                console.log(`Failed to add/update complex info, status = ${res.status}`);
                setStatus('Неудачная попытка для добавления/изменения данных. Проверьте вводимые параметры.');
                return;
            }
            resetForm();
            dispatch(showModalToEditConfiguration({ 
                showModalToEditConfiguration: false, 
                complexIdToEdit: 0,
            }))
            dispatch(resetToInitialState({ isFirstTimeLoading: true }))
        }

        return (<Modal 
            show={state.showModalToEditConfiguration}
            onHide={handleNewConfigurationHide}>
            <Modal.Header closeButton>{
                state.complexIdToEdit > 0 ? `Конфигурация комплекса '${getComplexName(state.complexIdToEdit)}'` : "Конфигурация нового комплекса"
            }</Modal.Header>
            <Modal.Body>
                <Formik
                    initialValues={complexInfo}
                    validationSchema={validationSchema}
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
                        <FormGroup controlId="idGroup">
                            <FormLabel>Ид-р комплекса</FormLabel>
                            <FormControl
                                name="id"
                                type="text"
                                placeholder='123'
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.id}
                                isInvalid={touched.id && errors.id}
                            />
                            <div style={{ color: 'red' }}>{errors.id}</div>
                        </FormGroup>
                        <br/>
                        <FormGroup controlId="nameGroup">
                            <FormLabel>Имя комплекса</FormLabel>
                            <FormControl
                                name="name"
                                type="text"
                                placeholder='Безымянный комплекс'
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.name}
                                isInvalid={touched.name && errors.name}
                            />
                            <div style={{ color: 'red' }}>{errors.name}</div>
                        </FormGroup>
                        <br/>
                        <FormGroup controlId="ipGroup">
                            <FormLabel>IP адрес комплекса</FormLabel>
                            <FormControl
                                name="ip"
                                type="text"
                                placeholder='192.168.0.123'
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.ip}
                                isInvalid={touched.ip && errors.ip && status}/>
                            { status ? <div style={{color: 'red'}}>{status}</div> : <div style={{color: 'red'}}>{errors.ip}</div> }
                        </FormGroup>
                        <br/>
                        <Button 
                            className='d-flex justify-content-center'
                            variant="outline-success" 
                            type="submit" 
                            disabled={isSubmitting} onClick={handleSubmit}>
                            <div className='p-1'>Подтвердить</div>
                            { isSubmitting &&
                                <span className="spinner-border spinner-border-md" role="status" aria-hidden="true"></span> }                
                        </Button>
                    </Form>)}
                </Formik>
            </Modal.Body>
        </Modal>)
    }

    const handleSettingsHide = () => {
        console.log('ComplexesConfig::handleSettingsHide ENTER')
        dispatch(setHaveComplexSettingInfo({ haveComplexSettingInfo: false }))
        dispatch(showModalToComplexSettings({ showModalToComplexSettings: false, complexIdToSettings: 0 }))
        dispatch(setComplexSettingsInfoRequestInProgress({ complexSettingsInfoRequestInProgress: false }))
}

    const unauthorizedCallback = () => {
        window.localStorage.removeItem('authInfo');
        dispatch(setLoggedState({ isLoggedIn: false }))
    }

    const updateComplexSettingsInfo = async (id) => {
        var res;
        try {
          res = await axios({
            url: `http://${GetUrlProperties().hostname}:50001/api/complexes/${id}/configuration`,
            method: 'get',
            headers: {'Authorization': `Bearer ${token}`}
          })
        } catch(err) {
          console.log(`ComplexesConfig::updateComplexSettingsInfo: Failed to request settings complexes info: ${JSON.stringify(err.response.status)}, code: ${JSON.stringify(err.response)}`)
          if (err.response.status === 401) {
            unauthorizedCallback()
          }
          return;
        }
        console.log(`ComplexesConfig::updateComplexSettingsInfo: Complex settings info: ${JSON.stringify(res.data)}`)
        window.localStorage.setItem('complexSettingsInfo', JSON.stringify(res.data))
        dispatch(setHaveComplexSettingInfo({ haveComplexSettingInfo: true }))
        dispatch(setComplexSettingsInfoRequestInProgress({ complexSettingsInfoRequestInProgress: false }))
    }

    const renderComplexesSettings = (state) => {
        // console.log(`ComplexesConfig::renderComplexesSettings: state ${JSON.stringify(state)}`)

        const onSubmit = async (values, { resetForm, setStatus }) => {
            console.log(`ComplexesConfig::renderComplexesSettings::onSubmit: values = ${JSON.stringify(values)}`);
            setStatus(undefined);

            var res;
            try {
              res = await axios({
                url: `http://${GetUrlProperties().hostname}:50001/api/complexes/${state.complexIdToSettings}/configuration`,
                method: 'post',
                headers: {'Authorization': `Bearer ${token}`},
                data: values
              })
            } catch(err) {
              console.log(`ComplexesConfig::renderComplexesSettings::onSubmit: Failed to request settings complexes info: ${JSON.stringify(err.response.status)}, code: ${JSON.stringify(err.response)}`)
              if (err.response.status === 401) {
                unauthorizedCallback()
              }
              setStatus('Ошибка при отправке данных. Попробуйте повторить позднее.');
              return;
            }

            dispatch(setHaveComplexSettingInfo({ haveComplexSettingInfo: false }))
            dispatch(showModalToComplexSettings({ showModalToComplexSettings: false, complexIdToSettings: 0 }))
            dispatch(setComplexSettingsInfoRequestInProgress({ complexSettingsInfoRequestInProgress: false }))
        }

        if (state.haveComplexSettingInfo) {
            const infoString = window.localStorage.getItem('complexSettingsInfo')
            const info = JSON.parse(infoString).Configuration
            const keys = Object.keys(info)

            // console.log(`Info: ${JSON.stringify(info)}`)

            const validationInfo = {}
            keys.forEach((key) => {
                validationInfo[key] = yup.number()
                    .min(0, 'Период обновления должен состоять минимум из одной цифры')
                    .max(99999, 'Период обновления должен состоять не более чем из пяти цифер')
                    .required('Значение обязательно')
            })

            const validationSchema = yup.object().shape(validationInfo);
              
            return (<Modal 
                show={state.showModalToComplexSettings}
                onHide={handleSettingsHide}>
                <Modal.Header closeButton>{
                    `Настройка комплекса '${getComplexName(state.complexIdToSettings)}'`
                }</Modal.Header>
                <Modal.Body>
                    <Formik
                        validationSchema={validationSchema}
                        initialValues={info}
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
                            {
                                keys.map ((key) => {
                                    return (
                                        <Fragment key={key}>
                                            <FormGroup controlId={key}>
                                                <FormLabel>{`Период обновления для '${key}',  сек`}</FormLabel>
                                                <FormControl
                                                    name={key}
                                                    type="number"
                                                    placeholder='0'
                                                    onChange={handleChange}
                                                    onBlur={handleBlur}
                                                    value={values[key]}
                                                    isInvalid={touched[key] && errors[key]}
                                                />
                                                <div style={{ color: 'red' }}>{errors[key]}</div>
                                            </FormGroup>
                                            <br/>
                                        </Fragment>                                
                                    )
                                })
                            }
                            { status ? <Fragment><div style={{color: 'red'}}>{status}</div><br/></Fragment> : null }
                            { keys.length === 0 ? <Fragment><div style={{color: 'red'}}>Для этого комплекса нет данных о сенсорах</div><br/></Fragment> : null }
                            { keys.length > 0 ?
                                <Button 
                                    className='d-flex justify-content-center'
                                    variant="outline-success" 
                                    type="submit" 
                                    disabled={isSubmitting} onClick={handleSubmit}>
                                    <div className='p-1'>Подтвердить</div>
                                    { isSubmitting &&
                                        <span className="spinner-border spinner-border-md" role="status" aria-hidden="true"></span> }                
                                </Button> : null
                            }
                        </Form>)}
                    </Formik>
                </Modal.Body>
            </Modal>)
        } else {
            if (state.complexSettingsInfoRequestInProgress === false && state.complexIdToSettings !== 0) {
                console.log(`ComplexesConfig::updateComplexSettingsInfo(${state.complexIdToSettings})`)
                updateComplexSettingsInfo(state.complexIdToSettings)
                dispatch(setComplexSettingsInfoRequestInProgress({ complexSettingsInfoRequestInProgress: true }))
            }
            return (<Modal 
                    show={state.showModalToComplexSettings}
                    onHide={handleSettingsHide}>
                    <Modal.Header closeButton>{
                        `Настройка комплекса '${getComplexName(state.complexIdToSettings)}'`
                    }</Modal.Header>
                    <Modal.Body className='d-flex justify-content-center'>
                        <Spinner animation="border" variant="secondary"/>
                    </Modal.Body>
                </Modal>)
        }
    }

    const handleSelectedComplex = (index) => {
        dispatch(setSelectedComplexIndex( {selectedComplexIndex: index} ))
    }

    const renderButtons = (complexIndex, complex) => {
        const visibility = state.selectedComplexIndex === complexIndex ? 'visible' : 'invisible' 
        return (<ButtonGroup className={visibility}>
            <Button variant='outline-secondary' size='sm' onClick={() => { onEditClicked(complex.id) }}>
                <i className="bi bi-pencil"/>
            </Button>
            <Button variant='outline-secondary' size='sm' onClick={() => { onConfigClicked(complex.id) }}>
                <i className="bi bi-sliders"/>
            </Button>
            <Button variant='outline-secondary' size='sm' onClick={() => { onDeleteClicked(complex.id) }}>
                <i className="bi bi-trash"/>
            </Button>
        </ButtonGroup>) 
    }

    return (
        <Fragment>
            <div className='w-100 d-flex justify-content-end'>
                <OverlayTrigger
                    placement="bottom"
                    delay={{ show: 250, hide: 400 }}
                    overlay={<Tooltip id='newConfTooltip'>Создать конфигурацию для нового комплекса</Tooltip>}>
                    <Button variant='outline-success' onClick={handleNewConfigurationClick}>Новая конфигурация <i className="bi bi-plus-circle"></i></Button>
                </OverlayTrigger>
            </div>
            <Table striped hover>
                <thead>
                    <tr key='header'>
                        <th className='col-xs-1 col-sm-1 col-md-1 col-lg-1 col-xl-1 col-xxl-1'>#</th>
                        <th>Название</th>
                        <th>IP-адрес</th>
                        <th className='col-xs-2 col-sm-3 col-md-3 col-lg-2 col-xl-1 col-xxl-1'/>
                    </tr>
                </thead>
                <tbody>
                    {
                        complexes.map((complex, complexIndex) => {
                            return (
                                <tr key={complex.id}
                                    onMouseEnter={() => { handleSelectedComplex(complexIndex) }}
                                    onMouseLeave={() => { handleSelectedComplex(-1) }}>
                                    <td className='align-middle'>{complex.id}</td>
                                    <td className='align-middle'>{complex.name}</td>
                                    <td className='align-middle'>{complex.ip}</td>
                                    <td className='align-middle d-flex justify-content-end'>
                                        { renderButtons(complexIndex, complex) }
                                    </td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </Table>
            { renderDeleteConfigurationModal(state) }
            { renderEditConfigurationModal(state) }
            { renderComplexesSettings(state) }
        </Fragment>
    )
}

export default renderComplexesConfig;