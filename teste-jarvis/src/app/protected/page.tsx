import { cookies } from "next/headers";
import { verifyUserToken } from "@/lib/auth";

export default async function ProtectedPage() {
	const cookieStore = await cookies();
	const token = cookieStore.get("token")?.value ?? "";
	const payload = verifyUserToken(token);

	return (
		<div className="max-w-2xl mx-auto p-6">
			<h1 className="text-2xl font-semibold mb-2">Protected</h1>
			<p className="text-sm text-gray-600">Welcome {payload?.email}</p>
		</div>
	);
}


