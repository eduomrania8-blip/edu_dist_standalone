import { redirect } from 'next/navigation';
import { getGuidanceData } from '@/actions/guidanceActions';
import GuidanceDashboard from '@/components/GuidanceDashboard';
import { getUser } from '@/actions/authActions';

export const metadata = {
  title: 'لوحة التوجيه | منظومة التوزيع الذكي',
};

export default async function GuidancePage() {
  const user = await getUser();
  
  if (!user || user.role !== 'guidance') {
    redirect('/login');
  }

  const data = await getGuidanceData();

  if ('error' in data) {
    return (
      <div className="page-header">
        <h1 className="page-title text-red-500">حدث خطأ: {data.error}</h1>
      </div>
    );
  }

  return <GuidanceDashboard data={data} user={user} />;
}
