/**
 * @author @sgb004 to Orange
 * @version 2.1.8
 */
var orangeForms = {};

document.addEventListener( 'DOMContentLoaded', orangeFormReady );

function orangeFormReady(){
	var forms = document.querySelectorAll( 'form.orange-form' );
	var i;

	for( i=0; i<forms.length; i++ ){
		orangeForms[ forms[i].id ] = new OrangeForm( forms[i].id );
	}
}

/*
 * Orange Form
 */
function OrangeForm( form, o ){
	this.form = document.getElementById( form );
	this.loading = this.form.querySelectorAll( '.loading' );
	this.notices = this.form.querySelectorAll( '.notices' );
	this.fields = {};
	this.listeners = {};
	this.fieldsListeners = {};
	this.filters = {};
	this.fieldsFilters = {};
	this.useXMLHttpRequest = true;
	this.reset = true;
	this.name = this.form.name;
	this.redirectSuccess = '';

	this.noticesValidation = {
		notValid: 'Revise los campos con errores.',
		empty: 'Este campo es requerido.',
		notlength: 'El número de caracteres que debe tener este campo es de ',
		minlength: 'El número mínimo de caracteres es de ',
		maxlength: 'El número máximo de caracteres es de ',
		onlyDigits: 'Por favor escriba solo números.'
	};

	return this.init( this );
}

OrangeForm.prototype = {
	init: function( _this ){
		var useXMLHttpRequest = this.form.getAttribute( 'data-use-xml-http-request' );
		var reset = this.form.getAttribute( 'data-reset' );
		this.form.setAttribute( 'novalidate', 'novalidate' );

		if( useXMLHttpRequest === 'false' ){
			this.useXMLHttpRequest = false;
		}

		if( reset === 'false' ){
			this.reset = false;
		}

		if( this.useXMLHttpRequest ){
			var redirectSuccess = this.form.getAttribute('data-redirect-success');

			if( redirectSuccess != null ){
				this.redirectSuccess = redirectSuccess;
			}

			this.form.addEventListener( 'submit', function( e ){
				e.preventDefault();
				_this.submit();
			});
		}else{
			this.form.addEventListener( 'submit', function( e ){
				var isValid;
				_this.cleanNotices();
				isValid = _this.validate();

				if( !isValid ){
					e.preventDefault();
					_this.addNotices( _this.noticesValidation.notValid, 'danger' );
				}
			});
		}

		/*/
		this.form.addEventListener( 'submit', function( e ){
			if( this.useXMLHttpRequest ){
				e.preventDefault();
				alert();
				_this.submit();
			}else{
				var isValid;
				_this.cleanNotices();
				isValid = _this.validate();

				if( !isValid ){
					e.preventDefault();
				}
			}
		});
		/*/
		for( i=0; i<this.form.elements.length; i++ ){
			this.addField( this.form.elements[ i ] );
		}

		return this;
	},
	addField: function( field ){
		var _this = this;
		var type = field.tagName;
		type = type.toLowerCase();

		if( type == 'input' ){
			type = field.type.toLowerCase();
		}

		if( type != 'hidden' && type != 'submit' && this.fields[ field.name ] == undefined ){
			var format = field.getAttribute('data-format');

			if( format == 'only-digits' ){
				var pattern = field.getAttribute( 'data-pattern' );

				if( pattern == null || pattern == undefined ){
					field.setAttribute( 'data-pattern', '^[0-9]+$' );
					field.setAttribute( 'data-pattern-error', this.noticesValidation.onlyDigits );
				}

				field.addEventListener( 'keypress', function( e ){
					var inputValue = e.which;
					var character = String.fromCharCode(inputValue);
					var pattern = new RegExp(/[A-Za-z]/);

					if( pattern.test( character ) || inputValue == 32 ){
						e.preventDefault();
						this.focus();
					}
				});
			}

			if( type == 'radio' || type == 'checkbox' ){
				var j;
				var inputs = this.form.querySelectorAll( 'input[name="'+field.name+'"]' );
				for( j=0; j<inputs.length; j++ ){
					inputs[ j ].addEventListener('change', function(){
						_this.cleanFieldNotices( this.name );
					}, false);
				}
				field['validate'] = function(){
					var isValid = true;
					var required = this.getAttribute( 'required' );
					if( required != null && required != undefined ){
						var checked = this.form.querySelector( 'input[name="'+this.name+'"]:checked' );
						if( checked == null || checked == undefined ){
							isValid = false;
							_this.addFieldNotice( this.name, _this.noticesValidation.empty );
						}
					}

					return _this.applyFieldListener( this.name, isValid );
				};
			} else if ( type == 'select' ){
				field['validate'] = function(){
					var isValid = true;
					var required = this.getAttribute( 'required' );

					if( required != null && required != undefined && ( this.value == '' || this.value == null || this.value == undefined ) ){
							isValid = false;
							_this.addFieldNotice( this.name, _this.noticesValidation.empty );
					}

					return _this.applyFieldListener( this.name, isValid );
				}
				field.addEventListener( 'change', function(){
					_this.cleanFieldNotices( this.name );
					this.validate();
				});
			} else if ( type == 'file' ){
				field['validate'] = function(){
					var isValid = true;
					var i;
					var files = this.files;
					var required = this.getAttribute( 'required' );

					if( required != null && required != undefined ){
						value = this.value.trim();
						if( value == '' ){
							isValid = false;
							_this.addFieldNotice( this.name, _this.noticesValidation.empty );
						}else{
							var typesFile = this.getAttribute( 'data-types-file' );
							var sizeMax = parseInt( this.getAttribute( 'data-size-max' ) );
	
							if( isNaN( sizeMax ) ){
								sizeMax = 0;
							}

							pattern = ( typesFile != null && typesFile != undefined && typesFile != '' ) ? new RegExp( typesFile ) : '';

							if( sizeMax > 0 && typesFile != '' ){
								for( i=0; i<this.files.length; i++ ){

									if( pattern != '' ){
										if( !pattern.test( files[i].type ) ){
											_this.addFieldNotice( this.name, this.getAttribute('data-types-file-error') );
											isValid = false;
										}
									}
									
									if( isValid ){
										if( sizeMax > 0 && files[i].size > sizeMax ){
											_this.addFieldNotice( this.name, this.getAttribute('data-size-max-error') );
											isValid = false;
										}
									}
									
									if( !isValid ){
										break;
									}
								}
							}
						}
					}

					return _this.applyFieldListener( this.name, isValid );
				}
				field.addEventListener( 'change', function(){
					_this.cleanFieldNotices( this.name );
					this.validate();
				});
			} else {
				field['validate'] = function(){
					var isValid = true;
					var required = this.getAttribute( 'required' );
					var value = _this.applyFieldFilter( this.name, 'preValidateValue', this.value );
					var pattern = this.getAttribute( 'data-pattern' );
					var minlength = this.getAttribute('minlength');
					var maxlength = this.getAttribute('maxlength');
					var minvalue = this.getAttribute('data-minvalue');
					var maxvalue = this.getAttribute('data-maxvalue');

					if( required != null && required != undefined ){
						value = value.trim();
						if( value == '' ){
							var noticeEmpty = this.getAttribute('data-notice-empty');
							isValid = false;
							if( noticeEmpty == null ){
								noticeEmpty = _this.noticesValidation.empty;
							}
							_this.addFieldNotice( this.name, noticeEmpty );
						}
					}

					if( (pattern != null || pattern != undefined) && value != '' ){
						pattern = new RegExp( pattern );
						if( !pattern.test( value ) ){
							_this.addFieldNotice( this.name, this.getAttribute('data-pattern-error') );
							isValid = false;
						}
					}

					minlength = parseInt( minlength );
					maxlength = parseInt( maxlength );

					if( isNaN( minlength ) ){
						minlength = 0;
					}

					if( isNaN( maxlength ) ){
						maxlength = 0;
					}

					if( minlength > 0 || maxlength > 0 ){
						if( minlength > 0 && maxlength > 0 && minlength == maxlength && value.length > 0 && value.length < minlength ){
							_this.addFieldNotice( this.name, _this.noticesValidation.notlength+minlength );
							isValid = false;
						}else if( minlength > 0 && value.length < minlength && value.length > 0 ){
							_this.addFieldNotice( this.name, _this.noticesValidation.minlength+minlength );
							isValid = false;
						}/*else if( maxlength > 0 && value.length < maxlength && value.length > 0 ){
							_this.addFieldNotice( this.name, _this.noticesValidation.maxlength+maxlength );
							isValid = false;
						}
						*/
					}

					minvalue = parseFloat( minvalue );
					maxvalue = parseFloat( maxvalue );
					value = parseFloat( value );

					if( !isNaN( minvalue) ){
						if( value < minvalue ){
							var notice = this.getAttribute('data-minvalue-error');
							_this.addFieldNotice( this.name, notice+minvalue );
							isValid = false;
						}
					}

					if( !isNaN( maxvalue) ){
						if( value > maxvalue ){
							var notice = this.getAttribute('data-maxvalue-error');
							_this.addFieldNotice( this.name, notice+maxvalue );
							isValid = false;
						}
					}

					return _this.applyFieldListener( this.name, isValid );
				};
				field.addEventListener( 'change', function(){
					_this.cleanFieldNotices( this.name );
					this.validate();
				});
			}

			this.fields[ field.name ] = field;
		}
	},
	validate: function(){
		var isValid = true;
		var field, fieldIsValid;

		this.applyEventListener( 'before_validate' );

		for( field in this.fields ){
			fieldIsValid = this.fields[field].validate();
			if( !fieldIsValid ){
				isValid = false;
			}
		}

		this.applyEventListener( 'after_validate', isValid );

		isValid = this.applyFilter( 'form_is_valid', isValid );
		return isValid;
	},
	submit: function(){
		var _this = this;
		var isValid;
		
		this.cleanNotices();
		isValid = this.validate();

		if( isValid ){
			if( this.useXMLHttpRequest ){
				var data = new FormData( this.form );
				var xmlhttp = new XMLHttpRequest();

				xmlhttp.open( 'POST', this.form.action, true );

				xmlhttp.addEventListener( 'error', function( e ){
					_this.error( xmlhttp );
				});

				xmlhttp.addEventListener( 'readystatechange', function( e ) {
					if ( xmlhttp.readyState == 4 && xmlhttp.status == 200 ){
						var isJson = false;
						var responseJson = {};
						try{
							responseJson = JSON.parse( xmlhttp.responseText );
							isJson = true;
						}catch( error ){
							_this.error( xmlhttp );
						}

						if( isJson ){
							_this.success( responseJson, xmlhttp );
						}
					}
				});

				this.showLoading();
				this.disabled();

				//data = this.applyFilter( 'pre_send_data', data );
				xmlhttp.send( data );
			}
		}else{
			this.addNotices( this.noticesValidation.notValid, 'danger' );
		}
		return isValid;
	},
	error: function( xmlhttp ){
		console.log( xmlhttp.responseText );
		this.addNotices( 'Ocurrió un error al procesar la información.', 'danger' );
		this.enabled();

		this._error( xmlhttp );
		this.hiddenLoading();
	},
	success: function( result, xmlhttp ){
		console.log( xmlhttp.responseText );
		var typeNotice = 'danger';
		var i;

		this.enabled();

		if( result['success'] ){
			typeNotice = 'success';
			if( this.redirectSuccess != '' ){
			}
		}

		for( field in result.fields ){
			this.addFieldNotice( field, result.fields[ field ] );
		}

		if( result.notice != '' ){
			this.addNotices( result.notice, typeNotice );
		}
		
		this._success( result, xmlhttp );
		
		if( result['success'] && this.redirectSuccess != '' ){
			location.href = this.redirectSuccess;
		}else{
			this.hiddenLoading();
		}
		
		if( result['success'] && this.reset ){ 
			this.form.reset();
		}
	},
	enabled: function(){
		for( var i=0; i<this.form.elements.length; i++ ){
			this.form.elements[i].removeAttribute( 'disabled', 'disabled' );
		}
	},
	disabled: function(){
		for( var i=0; i<this.form.elements.length; i++ ){
			this.form.elements[i].setAttribute( 'disabled', 'disabled' );
		}
	},
	showLoading: function(){
		for( var i=0; i<this.loading.length; i++ ){
			this.loading[ i ].classList.remove( 'hidden' );
		}
	},
	hiddenLoading: function(){
		for( var i=0; i<this.loading.length; i++ ){
			this.loading[ i ].classList.add( 'hidden' );
		}
	},
	cleanNotices: function(){
		for( var i=0; i<this.notices.length; i++ ){
			this.notices[ i ].innerHTML = '';
		}
	},
	addNotices: function( notices, type ){
		this.addNoticesObject( this.notices, notices, type );
	},
	cleanNoticesFields: function(){
		for( var i = 0; i<this.form.elements.length; i++ ){
			if( this.form[i].name != '' ){
				this.cleanFieldNotices( this.form[i].name );
			}
		}
	},
	addFieldNoticeArea: function( name ){
		var noticeArea;

		if( this.form[name] == undefined || name == 'name' ){
			if( typeof this.name == 'string' ){
				name = this.name+'['+name+']';
			}
		}
		
		if( this.form[name] == undefined ){
			noticeArea = this.notices;
		}else{
			var parent, fieldType, i;
			field = ( this.form[name].length == undefined ) ? this.form[name] : this.form[name][0];
			if( field == undefined ){
				for( i=0; i<this.form.elements.length; i++ ){
					if( this.form.elements[i].name == name ){
						field = this.form.elements[i];
						break;
					}
				}
			}

			fieldType = field.tagName;

			fieldType = fieldType.toLowerCase();
			if( fieldType == 'input' ){
				fieldType = field.getAttribute( 'type' ).toLowerCase();
			}
			parent = ( fieldType == 'radio' || fieldType == 'checkbox' || fieldType == 'option' ) ? field.parentNode.parentNode : field.parentNode;

			noticeArea = parent.querySelector( '.field-notices' );
			noticeArea = this.applyFieldFilter( name, 'addFieldNoticeArea', noticeArea );

			if( noticeArea == null ){
				noticeArea = document.createElement( 'ul' );
				noticeArea.classList.add( 'field-notices' );
				parent.appendChild( noticeArea );
			}
		}
		return noticeArea;
	},
	cleanFieldNotices: function( name ){
		var noticeArea = this.addFieldNoticeArea( name );
		noticeArea.innerHTML = '';
	},
	addFieldNotice: function( name, notice ){
		this.addNoticesObject( this.addFieldNoticeArea( name ), notice, 'danger' );
	},
	addNoticesObject: function( o, notices, type ){
		var i, j;
		var noticesList = '';

		if( typeof(notices) == 'string' ){
			var t = notices;
			notices = [ t ];
		}

		if( o.length == undefined ){
			var t = o;
			o = [ t ];
		}

		for( i = 0; i<notices.length; i++ ){
			if( notices[i].msg != undefined && notices[i].type != undefined ){
				noticesList += '<li class="'+notices[i].type+'">'+notices[i].msg+'</li>';
			}else if( notices[i] != '' ){
				noticesList += '<li class="'+type+'">'+notices[i]+'</li>';
			}
		}

		for( var j=0; j<o.length; j++ ){
			o[ j ].innerHTML = noticesList;
		}
	},
	addEventListener: function( e, fn ){
		if( e == 'success' ){
			this._success = fn;
		}else if( e == 'error' ){
			this._error = fn;
		}else{
			if( this.listeners[ e ] == undefined ){
				this.listeners[ e ] = [];
			}
			this.listeners[ e ].push( fn );
		}
	},
	applyEventListener: function( e, p ){
		if( this.listeners[ e ] != undefined ){
			var i;
			for( i=0; i<this.listeners[ e ].length; i++ ){
				this.listeners[ e ][i]( this, p );
			}
		}
	},
	addFieldListener: function( field, fn ){
		this.fieldsListeners[ field ] = fn;
	},
	applyFieldListener: function( field, isValid){
		if( this.fieldsListeners[ field ] != undefined ){
			isValid = this.fieldsListeners[ field ]( this, field, isValid );
		}
		return isValid;
	},
	addFilter: function( filter, fn ){
		if( this.filters[ filter ] == undefined ){
			this.filters[ filter ] = [];
		}
		this.filters[ filter ].push( fn );
	},
	applyFilter: function( filter, p ){
		if( this.filters[ filter ] != undefined ){
			var i;
			for( i=0; i<this.filters[ filter ].length; i++ ){
				p = this.filters[ filter ][i]( this, p );
			}
		}
		return p;
	},
	addFieldFilter: function( field, filter, fn ){
		if( this.fieldsFilters[ field ] == undefined ){
			this.fieldsFilters[ field ] = {};
		}
		this.fieldsFilters[ field ][ filter ] = fn;
	},
	applyFieldFilter: function( field, filter, p ){
		if( this.fieldsFilters[ field ] != undefined ){
			if( this.fieldsFilters[ field ][ filter ] != undefined ){
				p = this.fieldsFilters[ field ][ filter ]( this, field, p );
			}
		}
		return p;
	},
	_error: function(){ },
	_success: function(){ }
};
