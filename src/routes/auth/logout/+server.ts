import { redirect } from '@sveltejs/kit';

export const GET = async ({ locals: { supabase } }) => {
	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('Error signing out:', error);
		throw redirect(307, '/auth/error');
	}

	redirect(307, '/');
};
