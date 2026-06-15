import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PAYBRO_OPTION, DASHED_OPTION } from '@gift-store/commerce';
import { PaymentProviderChooser } from '../payments/PaymentProviderChooser';

const both = [PAYBRO_OPTION, DASHED_OPTION];

describe('PaymentProviderChooser', () => {
  it('given options, when rendering, then one radio per provider is shown', () => {
    render(<PaymentProviderChooser options={both} value="paybro" onChange={() => undefined} />);

    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'PayBro' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Dashed' })).toBeInTheDocument();
  });

  it('given a value, when rendering, then exactly that option is checked', () => {
    render(<PaymentProviderChooser options={both} value="dashed" onChange={() => undefined} />);

    expect(screen.getByRole('radio', { name: 'Dashed' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'PayBro' })).not.toBeChecked();
  });

  it('given a click on an option, when selecting, then onChange fires with its id', () => {
    const onChange = vi.fn();
    render(<PaymentProviderChooser options={both} value="paybro" onChange={onChange} />);

    screen.getByRole('radio', { name: 'Dashed' }).click();

    expect(onChange).toHaveBeenCalledWith('dashed');
  });
});
