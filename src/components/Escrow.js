import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import { seller, taxCollector, price } from '../settings';
import Grid from '@material-ui/core/Grid';
import { Divider } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import EscrowPanel from './EscrowPanel';
import { useEscrowStateContext } from './EscrowState';
import { useTezos, useAccountPkh } from '../dapp';
import ArrowRightAltIcon from '@material-ui/icons/ArrowRightAlt';
import { code, getStorage } from '../contract';
import { UnitValue } from '@taquito/taquito';

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    marginBottom: 50
  },
  button: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  actionsContainer: {
    marginBottom: theme.spacing(2),
  },
  resetContainer: {
    padding: theme.spacing(3),
  },
}));

function getSteps() {
  return ['Create payment escrow', 'Fund escrow', 'Transfer'];
}

const CreateEscrow = (props) => {
  const tezos = useTezos();
  const labelwidth = 3;
  const datawidth  = 9;
  const { setAddress } = useEscrowStateContext();
  var account = useAccountPkh();
  const handleNext = () => {
    tezos.wallet.originate({
      code: code,
      init: getStorage(
        seller,                              // seller
        account,                             // buyer
        taxCollector,                        // taxcollector
        (parseInt(price)*1000000).toString() // price
      )
    }).send().then(op => {
      console.log(`Waiting for confirmation of origination...`);
      props.openSnack();
      return op.contract()
    }).then (contract => {
      props.closeSnack();
      setAddress(contract.address);
      props.handleNext();
      console.log(`Origination completed for ${contract.address}.`);
    }).catch(error => console.log(`Error: ${JSON.stringify(error, null, 2)}`));
  }
  return (
    <Grid container direction="row" justify="flex-start" alignItems="center" spacing={2}>
      <Grid item xs={12}>
        <Typography>Check escrow data below and click 'Create Escrow' button below:</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Buyer (yourself)</Typography>
      </Grid>
      <Grid item xs={datawidth}>
      { (account === null) ? (
        <Typography color='textSecondary'>
          (Connect to wallet)
        </Typography>
      ) : (
        <Typography style={{ fontFamily: 'Courier Prime, monospace' }}>
          { account }
        </Typography>
      )}
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Seller</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography style={{ fontFamily: 'Courier Prime, monospace' }}>{seller}</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Tax collector</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography style={{ fontFamily: 'Courier Prime, monospace' }}>{taxCollector}</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Tax</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography>20% ({(0.2 * price).toString()}ꜩ)</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Security deposit</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography>110% ({(1.1 * price).toFixed(2).toString()}ꜩ)</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Deadline</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography>{(new Date()).toLocaleDateString()}</Typography>
      </Grid>
      <Grid item>
        <Button
          color='secondary'
          variant='contained'
          disableElevation
          onClick={handleNext}
          disabled={ account === null }
        >
          create escrow
        </Button>
      </Grid>
    </Grid>
  )
}

const Transfer = (props) => {
  const { escrowState, setBalance } = useEscrowStateContext();
  const tezos = useTezos();
  console.log(`address: ${escrowState.address}`);
  const handleNext = () => {
    tezos.wallet.at(escrowState.address).then(contract => {
      contract.methods.complete(UnitValue).send().then(op => {
        props.openSnack();
        op.receipt().then(() => {
          props.closeSnack();
          setBalance(0);
          props.handleNext();
        })
      })
    });
  }
  return (
    <Grid container direction="row" justify="flex-start" alignItems="center" spacing={2}>
      <Grid item xs={12}>
        <Typography>You may now transfer the price amount to the seller and get back your security deposit.</Typography>
      </Grid>
      <Grid item xs={12}>
        <Alert severity="warning">We strongly advise you wait for the delivery to be completed.</Alert>
      </Grid>
      <Grid item xs={1} style={{ textAlign: 'right' }}>
        <ArrowRightAltIcon fontSize="small"/>
      </Grid>
      <Grid item xs={11}>
        <Typography>transfer price value ({price}ꜩ) to seller</Typography>
      </Grid>
      <Grid item xs={1} style={{ textAlign: 'right' }}>
        <ArrowRightAltIcon fontSize="small"/>
      </Grid>
      <Grid item xs={11}>
        <Typography>transfer back security deposit ({(1.1 * price).toFixed(2).toString()}ꜩ) to yourself</Typography>
      </Grid>
      <Grid item xs={1} style={{ textAlign: 'right' }}>
        <ArrowRightAltIcon fontSize="small"/>
      </Grid>
      <Grid item xs={11}>
        <Typography>transfer tax ({(0.2 * price).toString()}ꜩ) to tax collector</Typography>
      </Grid>
      <Grid item xs={12}>
        <Button
          color='secondary'
          variant='contained'
          disableElevation
          style={{ marginTop: 20 }}
          onClick={handleNext}
        >
          Transfer amounts
        </Button>
      </Grid>
    </Grid>
  )
}

const FundEscrow = (props) => {
  const labelwidth = 3;
  const datawidth  = 9;
  const securityDeposit = (1.1 * price);
  const tax = (0.2 * price);
  const total = 1 * price + 1 * securityDeposit + 1 * tax;
  console.log(`total : ${total}`);
  const { escrowState, setBalance } = useEscrowStateContext();
  const tezos = useTezos();
  const handleNext = () => {
    tezos.wallet.at(escrowState.address).then(contract => {
      contract.methods.fund(UnitValue).send({ amount: total.toString() }).then(op => {
        props.openSnack();
        op.receipt().then(() => {
          props.closeSnack();
          setBalance(total.toString());
          props.handleNext();
        })
      })
    });
  }
  return (
    <Grid container direction="row" justify="flex-start" alignItems="center" spacing={2}>
      <Grid item xs={12}>
      <Typography>Check funding amounts below and click 'Fund Escrow' button below:</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Price</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography>{price}ꜩ</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Security deposit</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography>{securityDeposit.toFixed(2).toString()}ꜩ (110%*{price}ꜩ)</Typography>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Tax</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography>{tax.toString()}ꜩ (20%*{price}ꜩ)</Typography>
      </Grid>
      <Grid item xs={6}>
        <Divider ></Divider>
      </Grid>
      <Grid item xs={6}>
      </Grid>
      <Grid item xs={labelwidth}>
        <Typography style={{ fontWeight: 'bold' }}>Total</Typography>
      </Grid>
      <Grid item xs={datawidth}>
        <Typography variant='h5'>{total.toString()}ꜩ</Typography>
      </Grid>
      <Grid item>
        <Button
          color='secondary'
          variant='contained'
          disableElevation
          onClick={handleNext}
        >
          Fund escrow
        </Button>
      </Grid>
    </Grid>
  )
}

function StepComponent(props) {
  switch (props.index) {
    case 0:
      return <CreateEscrow handleNext={props.handleNext} openSnack={props.openSnack} closeSnack={props.closeSnack}/>
    case 1:
      return <FundEscrow handleNext={props.handleNext} openSnack={props.openSnack} closeSnack={props.closeSnack}/>
    case 2:
      return <Transfer handleNext={props.handleNext} openSnack={props.openSnack} closeSnack={props.closeSnack}/>
    default:
      return (
        <div></div>
      );
  }
}

export default function Escrow(props) {
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const { setAddress } = useEscrowStateContext();
  const steps = getSteps();

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setAddress(undefined);
    setActiveStep(0);
  };

  return (
    <Card className={classes.root}>
      <EscrowPanel></EscrowPanel>
      <Divider></Divider>
      <Stepper activeStep={activeStep} orientation="vertical" color='secondary'>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <StepContent>
              <StepComponent
                index={index}
                activeStep={activeStep}
                steps={steps}
                handleBack={handleBack}
                handleNext={handleNext}
                classes={classes}
                openSnack={props.openSnack}
                closeSnack={props.closeSnack}
              >
              </StepComponent>
            </StepContent>
          </Step>
        ))}
      </Stepper>
      {activeStep === steps.length && (
        <Paper square elevation={0} className={classes.resetContainer}>
          <Typography>All steps completed - you&apos;re finished</Typography>
          <Button onClick={handleReset} className={classes.button}>
            Reset
          </Button>
        </Paper>
      )}
    </Card>
  );
}