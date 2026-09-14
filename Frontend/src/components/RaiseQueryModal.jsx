import React, { useState } from "react";
import { Modal, Button, Input, Select, Form, Spin } from "antd";
import { Send, MessageSquarePlus, UserCheck } from "lucide-react";
import { raiseQuery } from "../lib/socket";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import api from "../lib/api";

const { TextArea } = Input;
const { Option } = Select;

const RaiseQueryModal = ({ task, open, onClose }) => {
  const [form] = Form.useForm();
  const [queries, setQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [loading, setLoading] = useState(false);
  const currentUser = useSelector((state) => state.users.currentUser);

  // Load old queries
  React.useEffect(() => {
    if (open && task?._id) {
      loadQueries();
    }
  }, [open, task]);

  const loadQueries = async () => {
    setLoadingQueries(true);
    try {
      const response = await api.get(`/queries/task/${task._id}`);
      setQueries(response.data.data || []);
    } catch (error) {
      toast.error("Failed to load queries");
    } finally {
      setLoadingQueries(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();

      // Raise query to task creator (manager)
      await raiseQuery(task._id, values.message, task.assignedBy._id);

      toast.success("Query raised successfully!");
      form.resetFields();
      loadQueries(); // Reload list
      onClose();
    } catch (error) {
      toast.error("Failed to raise query");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Raise Query"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="space-y-4">
        {/* Old Queries */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-orange-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
              Q
            </div>
            <h4 className="font-semibold">
              Previous Queries ({queries.length})
            </h4>
          </div>
          {loadingQueries ? (
            <div className="flex items-center justify-center py-4">
              <Spin size="small" />
            </div>
          ) : queries.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No previous queries
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {queries.map((query, index) => (
                <div key={query._id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm mb-1">
                        {query.message}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{query.status}</span>
                        <span>
                          {new Date(query.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="message"
              label="New Query Message"
              rules={[
                { required: true, message: "Please enter query message" },
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Describe your new query..."
                autoSize={{ minRows: 2, maxRows: 5 }}
              />
            </Form.Item>

            <Form.Item label="Send Query To" className="mb-3">
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold">
                    {task?.assignedBy ? task.assignedBy?.name : ""}
                  </div>
                  <div className="text-sm text-gray-500">
                    Task Creator (Manager)
                  </div>
                </div>
              </div>
            </Form.Item>

            <div className="flex gap-3">
              <Button onClick={onClose} className="flex-1" disabled={loading}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                icon={<Send className="w-4 h-4 ml-1" />}
                className="flex-1"
              >
                Raise New Query
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  );
};

export default RaiseQueryModal;
