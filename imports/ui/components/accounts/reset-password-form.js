
'use strict';


import React, {
  Component,
  PropTypes,
} from 'react';

import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';

import { MKTextField } from '../../material-ui';
import { Modes, AccentColor } from './login';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Meteor, { Accounts } from 'baryshok-react-native-meteor';
import RaisedButton from '../raised-button';
import Theme from '../../theme';
import validationHelper from '../../helpers/validationHelper';

const { TextColor, GreyTextColor, SuccessIconColor } = Theme.Palette;
const { TextInputErrorColor, TextInputTintColor } = Theme.Palette;
const { TextFontSize, HeaderFontSize, SubmissionResponseFontSize } = Theme.Font;
const { TextInputFontSize, TextInputErrorFontSize } = Theme.Font;

const PasswordConfirmationErrorText = 'Passwords don\'t match';

const SubmissionAniDurationMS = 2000;
const SubmissionTimeoutMS = 10000;
const DefaultSubmissionError = new Error(
  'Unable to reset password at this time.\nPlease try again later'
);




class ResetPasswordForm extends Component {

  constructor(props) {
    super(props);

    this.state = {
      password: '',
      passwordValidated: true,
      passwordError: ' ',

      passwordConfirmation: '',
      passwordConfirmationValidated: true,
      passwordConfirmationError: ' ',

      submitting: false,
      submitted: false,
      submissionError: ' ',
    };

    this.registerInKeyboardAwareScrollView = this.registerInKeyboardAwareScrollView.bind(this);
    this.canResetPassword = this.canResetPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.switchToLoginMode = this.switchToLoginMode.bind(this);

    this.passwordInputView = null;
    this.passwordTextInput = null;

    this.passwordConfirmationInputView = null;
    this.passwordConfirmationTextInput = null;

    this.submissionAniTimeout = null;
    this.submissionTimeout = null;

    this.mounted = false;
  }




  componentDidMount() {
    this.mounted = true;
  }




  componentWillUnmount() {
    this.submissionTimeout && clearTimeout(this.submissionTimeout);
    this.submissionAniTimeout && clearTimeout(this.submissionAniTimeout);

    this.mounted = false;
  }




  registerInKeyboardAwareScrollView(view, textInput) {
    let { registerInKeyboardAwareScrollView } = this.props;

    if (view && textInput && registerInKeyboardAwareScrollView) {
      registerInKeyboardAwareScrollView({ view, textInput });
    }
  }




  canResetPassword() {
    return Boolean(
      this.state.password &&
      this.state.passwordValidated &&
      this.state.passwordConfirmation &&
      !this.state.submitting &&
      !this.state.submitted
    );
  }




  resetPassword() {
    // Preventing method from calling twice, because of 'onSubmitEditing' event firing twice on Android
    // https://github.com/facebook/react-native/issues/10443
    if (!this.canResetPassword()) { return; }

    if (!Meteor.status().connected) {
      return this.context.showToast(
        'No connection with the server.\n' +
        'Check Internet connection and try again'
      );
    }

    let { resetPasswordToken } = this.props;
    let { password, passwordConfirmation } = this.state;

    if (!resetPasswordToken) {
      return this.setState({
        submissionError: 'No reset password token',
      });
    }

    if (password !== passwordConfirmation) {
      return this.setState({
        passwordConfirmationError: PasswordConfirmationErrorText,
      });
    }


    let submit = new Promise((resolve, reject) => {
      if (!this.mounted) { return; }

      this.setState({
        submitting: true,
        submissionError: ' ',
      });

      Meteor.call('resetPasswordCustom', resetPasswordToken, password, (error) => {
        if (error) { return resolve(error); }
        return resolve();
      });
    });


    let submissionAnimation = new Promise((resolve, reject) => {
      this.submissionAniTimeout = setTimeout(resolve, SubmissionAniDurationMS);
    });


    let submission = new Promise((resolve, reject) => {
      Promise.all([ submit, submissionAnimation ]).then(values => {
        let submissionError = values[0];
        if (submissionError) { return reject(submissionError); }
        return resolve();
      }).catch(reason => {
        console.warn('[Error][ResetPasswordForm.resetPassword]', reason);
        return reject(DefaultSubmissionError);
      });
    });


    let submissionTimeout = new Promise((resolve, reject) => {
      this.submissionTimeout = setTimeout(() => {
        return reject(DefaultSubmissionError);
      }, SubmissionTimeoutMS);
    });


    let onSuccess = () => {
      if (!this.mounted) { return; }

      this.setState({
        submitting: false,
        submitted: true,
      });
    };


    let onFailure = (error) => {
      if (!this.mounted) { return; }

      this.setState({
        submitting: false,
        submissionError: error.reason || error.message,
      });
    };


    Promise.race([ submission, submissionTimeout ]).then(onSuccess, onFailure).catch(onFailure);
  }




  switchToLoginMode() {
    let { onModeChange } = this.props;
    onModeChange && onModeChange(Modes.Login);
  }




  render() {
    let editable = !this.state.submitting && !this.state.submitted;

    let passwordInputView = (
      <View
        ref={ref => this.passwordInputView = ref}
        onLayout={() => {
          this.registerInKeyboardAwareScrollView(
            this.passwordInputView,
            this.passwordTextInput
          );
        }}
        style={styles.passwordInputView}
      >
        <MKTextField
          ref={ref => this.passwordTextInput = ref}
          autoCapitalize='none'
          autoCorrect={false}
          editable={editable}
          keyboardType='default'
          onSubmitEditing={() => {
            this.passwordConfirmationTextInput &&
            this.passwordConfirmationTextInput.focus();
          }}
          onTextChange={(text) => {
            let validationResult = validationHelper.isPasswordMeetComplexityRequirements(text);
            this.setState({
              password: text,
              passwordValidated: validationResult.validated,
              passwordError: validationResult.error,
            });
          }}
          placeholder='Password'
          returnKeyType='next'
          password={true}
          style={styles.textInputView}
          value={this.state.password}
          floatingLabelEnabled={true}
          underlineEnabled={true}
          highlightColor={!this.state.passwordValidated ? TextInputErrorColor : AccentColor}
          tintColor={!this.state.passwordValidated ? TextInputErrorColor : null}
          textInputStyle={styles.textInput}
        />
        <Text style={styles.inputErrorText}>
          {this.state.passwordError}
        </Text>
      </View>
    );


    let passwordConfirmationInputView = (
      <View
        ref={ref => this.passwordConfirmationInputView = ref}
        onLayout={() => {
          this.registerInKeyboardAwareScrollView(
            this.passwordConfirmationInputView,
            this.passwordConfirmationTextInput
          );
        }}
        style={styles.passwordConfirmationInputView}
      >
        <MKTextField
          ref={ref => this.passwordConfirmationTextInput = ref}
          autoCapitalize='none'
          autoCorrect={false}
          editable={editable}
          keyboardType='default'
          onSubmitEditing={this.resetPassword}
          onTextChange={(text) => {
            this.setState({
              passwordConfirmation: text,
              passwordConfirmationValidated: true,
              passwordConfirmationError: ' ',
            });
          }}
          placeholder='Confirm password'
          returnKeyType='go'
          password={true}
          style={styles.textInputView}
          value={this.state.passwordConfirmation}
          floatingLabelEnabled={true}
          underlineEnabled={true}
          highlightColor={!this.state.passwordConfirmationValidated ? TextInputErrorColor : AccentColor}
          tintColor={!this.state.passwordConfirmationValidated ? TextInputErrorColor : null}
          textInputStyle={styles.textInput}
        />
        <Text style={styles.inputErrorText}>
          {this.state.passwordConfirmationError}
        </Text>
      </View>
    );


    let resetPasswordButton = (
      <RaisedButton
        disabled={!this.canResetPassword()}
        label='Reset'
        backgroundColor={AccentColor}
        onPress={this.resetPassword}
      />
    );


    let submissionResponseText = (
      <View style={styles.submissionResponseView}>
        <Icon
          name={'done'}
          size={28}
          color={SuccessIconColor}
          style={styles.submissionResponseIcon}
        />
        <Text style={styles.submissionResponseText}>
          Your password updated successfully!
        </Text>
      </View>
    );


    let submissionError = (
      <Text style={styles.submissionErrorText}>
        {this.state.submissionError}
      </Text>
    );


    let goBackToLoginButton = (
      <TouchableOpacity
        onPress={this.switchToLoginMode}
        style={styles.goBackToLoginButton}
      >
        <Text style={styles.goBackToLoginButtonText}>
          Back to Login
        </Text>
      </TouchableOpacity>
    );


    return (
      <View style={styles.wrapperView}>
        {passwordInputView}
        {passwordConfirmationInputView}
        {this.state.submitted ? submissionResponseText : resetPasswordButton}
        {submissionError}
        {goBackToLoginButton}
      </View>
    );
  }




  componentDidUpdate(prevProps, prevState) {
    if (this.state.submitting !== prevState.submitting) {
      let { onStartSubmitting, onEndSubmitting } = this.props;

      this.state.submitting ?
        onStartSubmitting && onStartSubmitting() :
        onEndSubmitting && onEndSubmitting();
    }
  }

}

ResetPasswordForm.propTypes = {
  passwordResetToken: PropTypes.string,
  onModeChange: PropTypes.func,
  onStartSubmitting: PropTypes.func,
  onEndSubmitting: PropTypes.func,
  registerInKeyboardAwareScrollView: PropTypes.func,
};

ResetPasswordForm.contextTypes = {
  showToast: PropTypes.func,
};




const styles = StyleSheet.create({
  wrapperView: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  passwordInputView: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  passwordConfirmationInputView: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    marginBottom: 24,
  },
  textInputView: {
    height: 48,
  },
  textInput: {
    fontSize: TextInputFontSize,
    color: TextColor,
  },
  inputErrorText: {
    fontSize: TextInputErrorFontSize,
    color: TextInputErrorColor,
    marginTop: 3,
    marginBottom: 1,
  },
  submissionErrorText: {
    fontSize: 14,
    color: '#ff6246',
    textAlign: 'center',
    marginTop: 16,
  },
  submissionResponseView: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  submissionResponseIcon: {
    marginTop: -4.5,
    marginRight: 4,
  },
  submissionResponseText: {
    flex: 1,
    fontSize: SubmissionResponseFontSize,
    color: TextColor,
  },
  goBackToLoginButton: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    marginTop: 8,
  },
  goBackToLoginButtonText: {
    fontSize: TextFontSize,
    color: TextColor,
    alignSelf: 'center',
  },
});


export default ResetPasswordForm;
