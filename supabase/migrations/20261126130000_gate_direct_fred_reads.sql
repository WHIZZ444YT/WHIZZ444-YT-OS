-- Series approvals are evaluated by the gateway. Hide FRED rows from direct browser reads.
alter policy public_read_economic_observations on public.economic_observations
  using (provider <> 'fred');
