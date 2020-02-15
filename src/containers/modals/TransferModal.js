import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BN from 'bignumber.js';

import { selectLoading } from 'selectors/loadingSelector';
import { transfer } from 'actions/networkAction';
import { getToken } from 'actions/tokenAction';

import Button from 'components/button/Button';
import Modal from 'components/modal/Modal';
import Input from 'components/input/Input';
import InputSelect from 'components/inputselect/InputSelect';
import Select from 'components/select/Select';

import networkService from 'services/networkService';
import { logAmount, powAmount } from 'util/amountConvert';

import * as styles from './TransferModal.module.scss';

function TransferModal ({ open, toggle, balances = [] }) {
  const ETH = networkService.OmgUtil.transaction.ETH_CURRENCY;
  const dispatch = useDispatch();
  const [ currency, setCurrency ] = useState(ETH);
  const [ value, setValue ] = useState('');
  const [ feeToken, setFeeToken ] = useState(ETH);
  const [ feeOptions, setFeeOptions ] = useState([]);
  const [ recipient, setRecipient ] = useState('');
  const [ metadata, setMetadata ] = useState('');
  const loading = useSelector(selectLoading(['TRANSFER/CREATE']));

  useEffect(() => {
    async function fetchFees () {
      // TODO: enable when omg-js bumped
      // const fees = await networkService.fetchFees();
      // setFeeOptions(fees);

      setFeeOptions([
        {
          amount: "30000000000000",
          currency: "0x0000000000000000000000000000000000000000",
          subunit_to_unit: "1000000000000000000"
        },
        {
          amount: "1000000000000000000",
          currency: "0x11b7592274b344a6be0ace7e5d5df4348473e2fa",
          subunit_to_unit: "1000000000000000000"
        }
      ]);
    }

    if (open && !feeOptions.length) {
      fetchFees();
    }
  }, [open, feeOptions]);

  const selectOptions = balances.map(i => ({
    title: i.name,
    value: i.currency,
    subTitle: `Balance: ${logAmount(i.amount, i.decimals)}`
  }));

  const usableFees = balances.filter(balance => {
    const feeObject = feeOptions.find(fee => fee.currency === balance.currency);
    if (feeObject) {
      if (new BN(balance.amount).gte(new BN(feeObject.amount))) {
        return true;
      }
    }
    return false;
  }).map(i => {
    const feeObject = feeOptions.find(fee => fee.currency === i.currency);
    const feeAmount = new BN(feeObject.amount).div(new BN(feeObject.subunit_to_unit));
    return {
      title: i.name,
      value: i.currency,
      subTitle: `Fee Amount: ${feeAmount.toString()}`
    }
  });

  async function submit () {
    if (
      value > 0 &&
      currency &&
      feeToken &&
      networkService.web3.utils.isAddress(recipient)
    ) {
      const valueTokenInfo = await getToken(currency);
      try {
        await dispatch(transfer({
          recipient,
          value: powAmount(value, valueTokenInfo.decimals),
          currency,
          feeToken,
          metadata
        }))
        handleClose();
      } catch (err) {
        console.warn(err);
      }
    }
  }

  function handleClose () {
    setCurrency(ETH);
    setValue('');
    setFeeToken(ETH);
    setRecipient('');
    setMetadata('');
    toggle();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <h2>Transfer</h2>

      <div className={styles.address}>
        {`From address : ${networkService.account}`}
      </div>

      <Input
        label='To Address'
        placeholder='0x'
        paste
        value={recipient}
        onChange={i => setRecipient(i.target.value)}
      />

      <InputSelect
        label='Amount to transfer'
        placeholder={0}
        value={value}
        onChange={i => setValue(i.target.value)}
        selectOptions={selectOptions}
        onSelect={i => setCurrency(i.target.value)}
        selectValue={currency}
      />

      <Select
        label='Fee Token'
        value={feeToken}
        options={usableFees}
        onSelect={i => setFeeToken(i.target.value)}
      />

      <Input
        label='Message'
        placeholder='-'
        value={metadata}
        onChange={i => setMetadata(i.target.value || '')}
      />

      <div className={styles.buttons}>
        <Button
          onClick={handleClose}
          type='outline'
          style={{ flex: 0 }}
        >
          CANCEL
        </Button>
        <Button
          onClick={submit}
          type='primary'
          style={{ flex: 0 }}
          loading={loading}
          disabled={
            value <= 0 ||
            !currency ||
            !feeToken ||
            !recipient ||
            !metadata ||
            !networkService.web3.utils.isAddress(recipient)
          }
        >
          TRANSFER
        </Button>
      </div>
    </Modal>
  );
}

export default TransferModal;
