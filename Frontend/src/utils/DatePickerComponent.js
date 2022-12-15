import React from 'react'
import { Form } from 'react-bootstrap';
 
class DatepickerComponent extends React.Component{
 
    render() {
        // console.log(`DatepickerComponent::render: ${JSON.stringify(this.props)}`)
        return(
            <div>
                <Form.Group controlId={this.props.id ? this.props.id : 'DatePicker'}>
                    {this.props.label && <Form.Label>{this.props.label}</Form.Label>}
                    <Form.Control 
                            type="date" 
                            name={this.props.name ? this.props.name : 'DatePicker'} 
                            max={this.props.max}
                            min={this.props.min}
                            value={this.props.selectedValue}
                            placeholder={this.props.placeholder ? this.props.placeholder : '2015-03-25'}
                            onChange={(e) => this.props.onChange(e)} />
                </Form.Group>
            </div>
        )
    }
     
}
 
export default DatepickerComponent;