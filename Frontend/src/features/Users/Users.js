import { Fragment } from 'react';
import { 
    Table, Button, ButtonGroup, Modal, OverlayTrigger, Tooltip,
    Form, FormGroup, FormLabel, FormControl, FormSelect,
    InputGroup, ToggleButton } from 'react-bootstrap';
import {
    showModalToAcceptUserDelete,
    showModalToAcceptUserDeleteError,
    showModalToEditUser,
    resetToInitialState,
    setIsSubmitting,
    setSelectedUserIndex,
    setLoggedState,
    showDialog,
} from '../../AppSlice.js'
import * as yup from 'yup';
import { Formik } from 'formik';
import axios from 'axios';
import GetUrlProperties from '../../utils/urls';
import cryptoJS from 'crypto-js'

export const renderUsers = (state, dispatch, token) => {
    if (!state.haveUsersInfo) {
        return null;
    }

    let usersInfo = window.localStorage.getItem('users')
    const users = JSON.parse(usersInfo)

    const unauthorizedCallback = () => {
        window.localStorage.removeItem('authInfo');
        dispatch(setLoggedState({ isLoggedIn: false }))
    }

    const resetUser = async (id) => {
        var res;
            try {
                res = await axios({
                    url: `http://${GetUrlProperties().hostname}:50001/api/users/${id}/reset`,
                    method: 'post',
                    headers: {'Authorization': `Bearer ${token}`}
                })
            } catch(err) {
                console.log(`Users::resetUser Failed to reset user: ${err}`)
                res = err.response
            }
    
            // console.log(`Request result: ${JSON.stringify(res)}`);
            if (res.status === 401) {
                unauthorizedCallback()
                return false;
            }
            if (res.status !== 201 && res.status !== 200) {
                console.log(`Users::resetUser Failed to reset user, status = ${res.status}`);
                dispatch(showDialog({dialog: {type: 'error', title: 'Сброс пользователя', message: 'Ошибка при сбросе пароля пользователя.', button: "OK"}}))
                return false;
            }
            dispatch(showDialog({dialog: {type: 'success', title: 'Сброс пользователя', message: `Временный пароль для пользователя: '${res.data.password}'`, button: "OK"}}))
            return true;
    }

    const onResetClicked = (id) => {
        // console.log(`On reset user ${id} clicked`)
        resetUser(id)
    }

    const onEditClicked = (id) => {
        // console.log(`On edit user ${id} clicked`)
        dispatch(showModalToEditUser({ showModalToEditUser: true, userIdToEdit: id }))
    }

    const onDeleteClicked = (id) => {
        // console.log(`On delete user ${id} clicked`)
        dispatch(showModalToAcceptUserDelete({ showModalToAcceptUserDelete: true, userIdToDelete: id }))
    }

    const handleNewUserClick = () => {
        // console.log('Users::handleNewUserClick')
        dispatch(showModalToEditUser({ showModalToEditUser: true, userIdToEdit: '' }))
    }

    const renderDeleteUserModal = (state) => {
        if (state.userIdToDelete === '') {
            return null
        }

        const deleteUser = async (id) => {
            dispatch(setIsSubmitting({ isSubmitting: true }))
            var res;
            try {
                res = await axios({
                    url: `http://${GetUrlProperties().hostname}:50001/api/users/${id}`,
                    method: 'delete',
                    headers: {'Authorization': `Bearer ${token}`}
                })
            } catch(err) {
                console.log(`Users::renderDeleteUserModal::deleteUser Failed to delete user: ${err}`)
                res = err.response
            }
    
            console.log(`Request result: ${JSON.stringify(res)}`);
            if (res.status === 401) {
                unauthorizedCallback()
                return false;
            }
            if (res.status !== 201 && res.status !== 200) {
                console.log(`Users::renderDeleteUserModal::deleteUser Failed to delete user, status = ${res.status}`);
                dispatch(showModalToAcceptUserDeleteError({showModalToAcceptComplexDeleteError: "Ошибка удаления."}))
                return false;
            }
            return true;
        }
    
        const handleDeleteDialogConfirm = (id) => {
            console.log(`Users::renderDeleteUserModal::handleDialogConfirmDelete ${id}`)
            deleteUser(id).then(result => {
                if (result) {
                    dispatch(showModalToAcceptUserDelete({ showModalToAcceptUserDelete: false, userIdToDelete: '' }))
                    dispatch(resetToInitialState({ isFirstTimeLoading: true }))
                }
                dispatch(setIsSubmitting({ isSubmitting: false }))
            })
        }
    
        const handleDeleteDialogClose = () => {
            dispatch(showModalToAcceptUserDelete({ showModalToAcceptUserDelete: false, userIdToDelete: '' }))
        }

        const user = users.find((item) => item.id === state.userIdToDelete)
        if (typeof user == 'undefined') {
            console.log(`Unable to find user ${state.userIdToDelete}`)
            return null
        }

        // console.log(`Users::renderDeleteUserModal Find user ${state.userIdToDelete} result: ${JSON.stringify(user)}`)
        return (
            <Modal show={state.showModalToAcceptUserDelete}>
                <Modal.Header>
                    <Modal.Title>Удаление пользователя</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div>{`Вы уверены что хотите удалить пользователя "${user.name}"?`}</div>
                    <div style={{ color: 'red' }}>{state.showModalToAcceptUserDeleteError}</div>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        className='d-flex justify-content-center'
                        disabled={state.isSubmitting}
                        variant="outline-success" 
                        onClick={() => { handleDeleteDialogConfirm(state.userIdToDelete) } }>
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


    const renderEditUserModal = (state) => {
        const validationSchemaNewUser = yup.object().shape({
            name: yup.string()
                .min(3, 'Имя пользователя должно быть больше 3х и меньше 20ти символов.')
                .max(20, 'Имя пользователя должно быть больше 3х и меньше 20ти символов.')
                .required('Имя пользователя обязательно'),
            password: yup.string()
                .min(5, 'Пароль должне быть минимум пять символов длинной и не более 20ти симоволов')
                .max(20, 'Пароль должне быть минимум пять символов длинной и не более 20ти симоволов')
                .required('Пароль обязателен'),
            password2: yup.string()
                .min(5, 'Пароль должне быть минимум пять символов длинной и не более 20ти симоволов')
                .max(20, 'Пароль должне быть минимум пять символов длинной и не более 20ти симоволов')
                .required('Повтор пароля обязателен'),
          });

          const validationSchemaEditUser = yup.object().shape({
            name: yup.string()
                .min(3, 'Имя пользователя должно быть больше 3х и меньше 20ти символов.')
                .max(20, 'Имя пользователя должно быть больше 3х и меньше 20ти символов.')
                .required('Имя пользователя обязательно'),
          });

        var userInfo;
        if (state.userIdToEdit !== '')
            userInfo = users.find((item) => item.id === state.userIdToEdit);
        else
            userInfo = { id: state.userIdToEdit, name: '', role: 'User'}            
        if (typeof userInfo !== 'undefined') {
            userInfo.showPassword = false;
            userInfo.showPassword2 = false;
        } else {
            userInfo = { id: '', name: '', role: 'User'}            
        }
        // console.log(`Users::renderEditUser userInfo=${JSON.stringify(userInfo)}`)

        const onSubmit = async (values, { resetForm, setStatus }) => {
            const newUserRequest = async (values, state) => {
                let password = cryptoJS.SHA1(values.password).toString(cryptoJS.enc.Hex)
                let res;
                // console.log('users::renderEditUserModal::onSubmit: before request')
                try {
                    res = await axios({
                        url: `http://${GetUrlProperties().hostname}:50001/api/users`,
                        method: 'put',
                        data: { id: values.id, name: values.name, password: password, role: values.role },
                        headers: {'Authorization': `Bearer ${token}`}
                    })
                } catch(err) {
                    console.log(`users::renderEditUserModal::onSubmit::newUserRequest: Failed to add user info: ${err}`)
                    res = err.response
                }    
                return res;
            }

            const updateUserRequest = async (values, state) => {
                let res;
                // console.log('users::renderEditUserModal::onSubmit: before request')
                try {
                    res = await axios({
                        url: `http://${GetUrlProperties().hostname}:50001/api/users/${values.id}`,
                        method: 'post',
                        data: { name: values.name, role: values.role },
                        headers: {'Authorization': `Bearer ${token}`}
                    })
                } catch(err) {
                    console.log(`users::renderEditUserModal::onSubmit::updateUserRequest: Failed to add user info: ${err}`)
                    res = err.response
                }    
                return res;
            }

            // console.log(`Users::renderEditUser::onSubmit: values = ${JSON.stringify(values)}`);
            if (values.password !== values.password2) {
                setStatus('Пароли должны совпадать.');
                return;
            }

            setStatus(undefined);
            
            let res;
            if (state.userIdToEdit === '') {
                res = await newUserRequest(values, state);
            } else {
                res = await updateUserRequest(values, state);
            }
            // console.log('users::renderEditUserModal::onSubmit: after request')
            console.log(`users::renderEditUserModal::onSubmit: Request result: ${JSON.stringify(res)}`);
            if (res.status === 401) {
                unauthorizedCallback()
                return;
            }
            if (res.status !== 201 && res.status !== 200) {
                console.log(`users::renderEditUserModal::onSubmit: Failed to add user info, status = ${res.status}`);
                setStatus('Неудачная попытка для добавления/обновления пользователя. Проверьте вводимые параметры.');
                return;
            }
            // await new Promise(resolve => setTimeout(resolve, 3000))
            resetForm();
            dispatch(showModalToEditUser({ 
                showModalToEditUser: false, 
                userIdToEdit: '',
            }))
            dispatch(resetToInitialState({ isFirstTimeLoading: true }))
        }

        const handleNewUserHide = () => {
            // console.log('handle new user modal hide')
            dispatch(showModalToEditUser({ showModalToEditUser: false, userIdToEdit: 0 }))
        }

        const renderPasswords = (values, handleChange, status, errors, handleBlur, touched) => {
            return (<Fragment>
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
                            <FormLabel>Повтор пароля</FormLabel>
                            <InputGroup>
                                <FormControl
                                    name='password2'
                                    type={values.showPassword2 ? 'text' : 'password'}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    value={values.password2}
                                    isInvalid={touched.name || errors.password2 || status}/>
                                <ToggleButton
                                    type='checkbox' 
                                    variant='secondary'
                                    value={values.showPassword2} 
                                    onClick={() => {
                                        // console.log(`Users::renderEditUserModal::onClick: values = ${JSON.stringify(values)}`)
                                        handleChange({ target: { name: 'showPassword2', value: !values.showPassword2 }}); } }>
                                    <i className={`bi ${values.showPassword2 ? "bi-eye-slash" : "bi-eye"}`}/>
                                </ToggleButton>
                            </InputGroup>
                            { status ? <div style={{color: 'red'}}>{status}</div> : <div style={{color: 'red'}}>{errors.password2}</div> }
                        </FormGroup>
                        <br/>
                    </Fragment>)}
        const initialValues = userInfo
        initialValues.showPassword = false
        initialValues.showPassword2 = false
        initialValues.password = ""
        initialValues.password2 = ""
        return (<Modal 
            show={state.showModalToEditUser}
            onHide={handleNewUserHide}>
            <Modal.Header closeButton>{
                state.userIdToEdit !== '' ? `Редактирование пользователя ${userInfo.name}` : "Создание нового пользотеля"
            }</Modal.Header>
            <Modal.Body>
                <Formik
                    initialValues={userInfo}
                    validationSchema={ state.userIdToEdit !== '' ? validationSchemaEditUser : validationSchemaNewUser}
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
                        <FormGroup controlId="nameGroup">
                            <FormLabel>Имя пользователя</FormLabel>
                            <FormControl
                                name="name"
                                type="text"
                                placeholder='Пользователь'
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.name}
                                isInvalid={touched.name && errors.name}
                            />
                            <div style={{ color: 'red' }}>{errors.name}</div>
                        </FormGroup>
                        <br/>
                        <FormGroup controlId="roleGroup">
                            <FormLabel>Роль пользователя</FormLabel>
                            <FormSelect
                                name="role"
                                type="text"
                                placeholder='User'
                                onChange={handleChange}
                                onBlur={handleBlur}
                                value={values.role}
                                isInvalid={touched.role && errors.role}>
                                <option>User</option>
                                <option>Service</option>
                                <option>Admin</option>
                            </FormSelect>
                            <div style={{color: 'red'}}>{errors.role}</div>
                        </FormGroup>
                        <br/>
                        { state.userIdToEdit === '' && renderPasswords(values, handleChange, status, errors, handleBlur, touched) }
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

    const handleSelectedUser = (index) => {
        dispatch(setSelectedUserIndex( {selectedUserIndex: index} ))
    }

    const renderButtons = (userIndex, user) => {
        const visibility = state.selectedUserIndex === userIndex ? 'visible' : 'invisible' 
        return (<ButtonGroup className={visibility}>
            <Button variant='outline-secondary' size='sm' onClick={() => { onResetClicked(user.id) }}>
                <i className="bi bi-person-check"></i>
            </Button>
            <Button variant='outline-secondary' size='sm' onClick={() => { onEditClicked(user.id) }}>
                <i className="bi bi-pencil"/>
            </Button>
            <Button variant='outline-secondary' size='sm' onClick={() => { onDeleteClicked(user.id) }}>
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
                    overlay={<Tooltip id='newUserTooltip'>Добавить нового пользователя</Tooltip>}>
                    <Button variant='outline-success' onClick={handleNewUserClick}>Добавить нового пользователя <i className="bi bi-plus-circle"></i></Button>
                </OverlayTrigger>
            </div>
            <Table striped hover>
                <thead>
                    <tr>
                        <th>Имя</th>
                        <th>Роль</th>
                        <th className='col-xs-2 col-sm-3 col-md-3 col-lg-2 col-xl-1 col-xxl-1'/>
                    </tr>
                </thead>
                <tbody>
                    {
                        users.map((user, userIndex) => {
                            return (
                                <tr
                                    key={user.id}
                                    onMouseEnter={() => handleSelectedUser(userIndex)}
                                    onMouseLeave={() => handleSelectedUser(-1)}>
                                    <td className='align-middle'>{user.name}</td>
                                    <td className='align-middle'>{user.role}</td>
                                    <td className='align-middle d-flex justify-content-end'>
                                        { renderButtons(userIndex, user) }
                                    </td>
                                </tr>
                            )
                        })
                    }
                </tbody>
            </Table>
            { renderDeleteUserModal(state) }
            { renderEditUserModal(state) }
        </Fragment>)
}

export const updateUsers = async (token, callback, unauthorizedCallback) => {
    // console.log('users::updateUsers: [ENTER]')
    var res;
    try {
      res = await axios({
        url: `http://${GetUrlProperties().hostname}:50001/api/users`,
        method: 'get',
        headers: {'Authorization': `Bearer ${token}`}
      })
    } catch(err) {
      console.log(`Failed to request users info: ${JSON.stringify(err.response.status)}, code: ${JSON.stringify(err.response)}`)
      if (err.response.status === 401) {
        unauthorizedCallback()
      }
      return;
    }  
    // console.log(`Users request result: ${JSON.stringify(res)}`)

    let result = res.data.map((item) => { 
        return {
            id: item.ID,
            name: item.Name,
            role: `${item.Role[0].toUpperCase()}${item.Role.slice(1)}`
        }}).sort(nameSorter);
    callback(result)
}

const nameSorter = (a, b) => { 
    if(a.name < b.name) {
      return -1;
    }
    if(a.name > b.name) {
      return 1;
    }
    return 0;
  }