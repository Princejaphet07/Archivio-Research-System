import React from 'react';
import Layout from '../components/Layout';

function SendInvitations() {
  return (
    <Layout title="Send Invitations" breadcrumb="ARCHIVIO › Send Invitations" showSearch={true}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-1">Send Invitations</h1>
          <p className="text-sm text-gray-500">Send registration links to student group leaders — type their email and send</p>
        </div>

        {/* Action Card */}
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
          <div className="text-4xl text-[#7a2e46] mb-3">✉️</div>
          <h2 className="text-2xl font-serif font-bold text-[#7a2e46] mb-2">Send Group Registration Link</h2>
          <p className="text-gray-500 text-sm max-w-lg mb-6">
            Type the Group Leader's email address below and click Send. The leader will receive a registration link valid for 24 hours. Members receive individual invitations after the leader registers the group.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#7a2e46]">M</span>
              <input type="email" placeholder="e.g. carlo.mendoza@student.edu" className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#7a2e46]" />
            </div>
            <button className="bg-[#7a2e46] text-white font-bold px-6 py-3 rounded-lg hover:bg-[#5f2135] transition whitespace-nowrap">
              Send Link
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-4">💡 Only send to the group leader — not individual members.</p>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-5 border-b border-gray-200">
            <h3 className="font-bold text-gray-900 text-lg">Sent Invitations</h3>
            <p className="text-xs text-gray-500">Last 30 days · auto-updates when you send above</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#faf5f6] text-[#7a2e46] text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-6">Leader Email</th>
                  <th className="py-3 px-6">Sent</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { email: 'carlo.mendoza@student.edu', sent: 'Feb 5, 2027', status: 'Pending', sColor: 'text-yellow-700 bg-yellow-50', action: 'Resend' },
                  { email: 'diana.cruz@student.edu', sent: 'Feb 3, 2027', status: 'Pending', sColor: 'text-yellow-700 bg-yellow-50', action: 'Resend' },
                  { email: 'juan.delacruz@student.edu', sent: 'Jan 4, 2027', status: 'Registered', sColor: 'text-green-700 bg-green-50', action: 'View Group' },
                  { email: 'reyna.cruz@student.edu', sent: 'Jan 6, 2027', status: 'Registered', sColor: 'text-green-700 bg-green-50', action: 'View Group' },
                ].map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-4 px-6 text-gray-700 font-medium">{item.email}</td>
                    <td className="py-4 px-6 text-gray-500">{item.sent}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${item.sColor}`}>• {item.status}</span>
                    </td>
                    <td className="py-4 px-6">
                      <button className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs font-semibold hover:bg-gray-50">
                        {item.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default SendInvitations;