import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { fetchTaskById } from '../../redux/slices/task/taskSlice';

const TaskDetailsDialog = ({ task, open, onClose }) => {
    const dispatch = useDispatch();
    const { selectedTask, status, error } = useSelector((state) => state.tasks);

    useEffect(() => {
        if (task?._id) {
            dispatch(fetchTaskById(task._id));
        }
    }, [dispatch, task]);

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedTask?.title}</DialogTitle>
                </DialogHeader>
                {status === 'loading' && <div>Loading...</div>}
                {status === 'failed' && <div>Error: {error}</div>}
                {status === 'succeeded' && selectedTask && (
                    <div>
                        <div className="space-y-4">
                            <div>
                                <strong>Description:</strong>
                                <p>{selectedTask.description}</p>
                            </div>
                            <div>
                                <strong>Status:</strong>{' '}
                                <Badge variant={
                                    selectedTask.status === 'completed' ? 'success' :
                                    selectedTask.status === 'in-progress' ? 'in-progress' :
                                    'pending'
                                }>
                                    {selectedTask.status}
                                </Badge>
                            </div>
                            <div>
                                <strong>Due Date:</strong>{' '}
                                {new Date(selectedTask.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            {selectedTask.assignedBy && (
                                <div>
                                    <strong>Assigned By:</strong> {selectedTask.assignedBy.name}
                                </div>
                            )}
                             {selectedTask.checklist && selectedTask.checklist.length > 0 && (
                                <div>
                                    <strong>Checklist:</strong>
                                    <ul>
                                        {selectedTask.checklist.map((item, index) => (
                                            <li key={index}>{item.text}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default TaskDetailsDialog;
