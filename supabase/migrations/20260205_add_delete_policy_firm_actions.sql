-- Policy for deleting (authenticated users can delete)
create policy "Authenticated users can delete firm_actions"
on public.firm_actions
for delete
to authenticated
using (true);
