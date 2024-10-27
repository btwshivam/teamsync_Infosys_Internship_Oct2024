import React, { useEffect, useState, useRef } from 'react';
import styled from "styled-components";
import { useTheme } from "styled-components";
import OtpInput from 'react-otp-input';
import CircularProgress from "@mui/material/CircularProgress";
import { useDispatch } from 'react-redux';
import { openSnackbar } from "../redux/snackbarSlice";
import axios from 'axios';
import { loginSuccess } from '../redux/userSlice'; // Import loginSuccess action
import { useNavigate } from 'react-router-dom'; // Import useNavigate for redirect
import { useSetRecoilState } from "recoil";
import { userEmailState, userIdState, isAdminState } from "../store/atoms/authAtoms";
import {jwtDecode} from "jwt-decode"

const Title = styled.div`
  font-size: 22px;
  font-weight: 500;
  color: ${({ theme }) => theme.text};
  margin: 16px 22px;
`;

const OutlinedBox = styled.div`
  height: 44px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.soft2};
  color: ${({ theme }) => theme.soft2};
  margin: 3px 20px;
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 500;
  padding: 0px 14px;
  ${({ googleButton, theme }) =>
        googleButton &&
        `user-select: none; gap: 16px;`}
  ${({ button, theme }) =>
        button &&
        `user-select: none; border: none; background: ${theme.itemHover}; color: '${theme.soft2}';`}
  ${({ activeButton, theme }) =>
        activeButton &&
        `user-select: none; border: none; background: ${theme.primary}; color: white;`}
`;

const LoginText = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.soft2};
  margin: 0px 26px 0px 26px;
`;
const Span = styled.span`
  color: ${({ theme }) => theme.primary};
  font-size: 12px;
  margin: 0px 26px 0px 26px;
`;

const Error = styled.div`
  color: red;
  font-size: 12px;
  margin: 2px 26px 8px 26px;
  display: block;
  ${({ error }) => error === "" && `display: none;`}
`;

const Timer = styled.div`
  color: ${({ theme }) => theme.soft2};
  font-size: 12px;
  margin: 2px 26px 8px 26px;
  display: block;
`;

const Resend = styled.div`
  color: ${({ theme }) => theme.primary};
  font-size: 14px;
  margin: 2px 26px 8px 26px;
  display: block;
  cursor: pointer;
`;

const OTP = ({ email, name, otpVerified, setOtpVerified, reason }) => {

    const setEmailRecoil = useSetRecoilState(userEmailState);
    const setIsAdminRecoil = useSetRecoilState(isAdminState);
    const setUserIdRecoil = useSetRecoilState(userIdState);

    const theme = useTheme();
    const dispatch = useDispatch();
    const navigate = useNavigate()

    const [otp, setOtp] = useState('');
    const [otpError, setOtpError] = useState('');
    const [otpLoading, setOtpLoading] = useState(false);
    const [disabled, setDisabled] = useState(true);
    const [showTimer, setShowTimer] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [timer, setTimer] = useState('00:00');

    const Ref = useRef(null);

    

    const getTimeRemaining = (e) => {
        const total = Date.parse(e) - Date.parse(new Date());
        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        return { total, minutes, seconds };
    };

    const startTimer = (e) => {
        let { total, minutes, seconds } = getTimeRemaining(e);
        if (total >= 0) {
            setTimer(
                (minutes > 9 ? minutes : '0' + minutes) + ':' +
                (seconds > 9 ? seconds : '0' + seconds)
            );
        }
    };

    const clearTimer = (e) => {
        setTimer('01:00');
        if (Ref.current) clearInterval(Ref.current);
        const id = setInterval(() => {
            startTimer(e);
        }, 1000);
        Ref.current = id;
    };

    const getDeadTime = () => {
        let deadline = new Date();
        deadline.setSeconds(deadline.getSeconds() + 60);
        return deadline;
    };

    const resendOtp = () => {
        setShowTimer(true);
        clearTimer(getDeadTime());
        sendOtp();
    };

    const sendOtp = async () => {
        try {
            const response = await axios.post('http://localhost:3001/user/verify', { email });
            if (response.status === 200) {
                dispatch(openSnackbar({
                    message: "OTP sent Successfully",
                    severity: "success",
                }));
                setDisabled(true);
                setOtp('');
                setOtpError('');
                setOtpLoading(false);
                setOtpSent(true);
            } else {
                dispatch(openSnackbar({
                    message: response.status,
                    severity: "error",
                }));
                setOtp('');
                setOtpError('');
                setOtpLoading(false);
            }
        } catch (err) {
            dispatch(openSnackbar({
                message: err.message,
                severity: "error",
            }));
        }
    };

    const validateOtp = async () => {
        setOtpLoading(true);
        setDisabled(true);
        try {
            const response = await axios.put('http://localhost:3001/user/verify', {
                email: email,
                registerOtp: otp
            });
    
            if (response.status === 200) {
                const token = response.data.token;
    
                dispatch(loginSuccess({ token }));
                localStorage.setItem('token', token);

                const decoded = jwtDecode(response.data.token);
                setEmailRecoil(decoded.email);
                setIsAdminRecoil(!!decoded.admin_id);
                setUserIdRecoil(decoded.admin_id || decoded.user_id);
                localStorage.setItem("userName",resendOtp.data.name);
                localStorage.setItem("userEmail",decoded.email);
                localStorage.setItem("userJoindate",response.data.joined_at) 

                setOtpVerified(true);
                setOtp('');
                setOtpError('');
                setDisabled(false);
                dispatch(openSnackbar({
                    message: "OTP verified successfully!",
                    severity: "success",
                }));
                setTimeout(() => {
                    if (!decoded.admin_id) {
                      navigate('/dashboard/user');
                    }
                  }, 100);
    
            } else {
                setOtpLoading(false);
                setDisabled(false);
                setOtpError(response.data.message);
                dispatch(openSnackbar({
                    message: response.data.message,
                    severity: "error",
                }));
            }
        } catch (err) {
            dispatch(openSnackbar({
                message: "Enter a valid otp",
                severity: "error",
            }));
            setOtpError("Enter a valid otp");
        } finally {
            // Ensure loading state is reset in all cases
            setOtpLoading(false);
            setDisabled(false);
        }
    };
    //hello
    
    

    //tst
    useEffect(() => {
        sendOtp();
        clearTimer(getDeadTime());
    }, []);

    useEffect(() => {
        if (timer === '00:00') {
            setShowTimer(false);
        } else {
            setShowTimer(true);
        }
    }, [timer]);

    useEffect(() => {
        if (otp.length === 6) {
            setDisabled(false);
        } else {
            setDisabled(true);
        }
    }, [otp]);

    return (
        <div>
            <Title>VERIFY OTP</Title>
            <LoginText>A verification <b>&nbsp;OTP &nbsp;</b> has been sent to:</LoginText>
            <Span>{email}</Span>
            {!otpSent ? (
                <div style={{ padding: '12px 26px', marginBottom: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', justifyContent: 'center' }}>
                    Sending OTP<CircularProgress color="inherit" size={20} />
                </div>
            ) : (
                <div>
                    <OtpInput
                        value={otp}
                        onChange={setOtp}
                        numInputs={6}
                        shouldAutoFocus={true}
                        inputStyle={{ fontSize: "22px", width: "38px", height: "38px", borderRadius: "5px", border: "1px solid #ccc", textAlign: "center", margin: "6px 4px", backgroundColor: 'transparent', color: theme.text }}
                        containerStyle={{ padding: '8px 2px', justifyContent: 'center' }}
                        renderInput={(props) => <input {...props} />}
                    />
                    <Error error={otpError}><b>{otpError}</b></Error>

                    <OutlinedBox
                        button={true}
                        activeButton={!disabled}
                        style={{ marginTop: "12px", marginBottom: "12px" }}
                        onClick={validateOtp}
                    >
                        {otpLoading ? (
                            <CircularProgress color="inherit" size={20} />
                        ) : (
                            "Submit"
                        )}
                    </OutlinedBox>

                    {showTimer ? (
                        <Timer>Resend in <b>{timer}</b></Timer>
                    ) : (
                        <Resend onClick={resendOtp}><b>Resend</b></Resend>
                    )}
                </div>
            )}
        </div>
    );
};

export default OTP;